// Streamable HTTP transport (MCP spec 2025-03-26+, current revision
// 2025-11-25) — for remote MCP clients, served at https://calc.fatfort.com/mcp.
//
// Session model (stateful mode, per the Streamable HTTP spec):
//   - An initialize POST with no Mcp-Session-Id creates a session; the
//     transport assigns an ID and returns it in the Mcp-Session-Id header.
//   - Subsequent POST/GET/DELETE requests carry that header and are routed to
//     the session's transport. GET opens the optional server->client SSE
//     stream; DELETE terminates the session.
//   - Unknown session IDs get 404, non-initialize requests without a session
//     get 400 — both per spec, so compliant clients transparently re-initialize.
//
// Hardening (this may be exposed publicly):
//   - request body capped at 256 KB (mirrors the upstream API's cap)
//   - bounded number of concurrent sessions
//   - idle sessions reaped after 30 minutes
//   - binds 127.0.0.1 by default (set MCP_HOST=0.0.0.0 inside a container)
//   - upstream fetches carry their own timeout + size caps (see upstream.js)

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createCalcServer } from "./server.js";
import { DEFAULT_API_BASE } from "./upstream.js";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_SESSIONS = 100;
const SESSION_IDLE_MS = 30 * 60 * 1000;
const REAP_INTERVAL_MS = 60 * 1000;

function jsonError(res, status, code, message) {
  if (res.headersSent) return;
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const tooLarge = () =>
      Object.assign(new Error("request body too large"), { tooLarge: true });

    // Fast path: honest clients declare Content-Length; reject before reading.
    const declared = Number(req.headers["content-length"]);
    if (Number.isFinite(declared) && declared > limit) {
      reject(tooLarge());
      return;
    }

    const chunks = [];
    let size = 0;
    const onData = (chunk) => {
      size += chunk.length;
      if (size > limit) {
        req.removeListener("data", onData);
        // Do NOT destroy the socket here — the caller still needs to deliver
        // a 413. Node closes the connection after an unconsumed request.
        reject(tooLarge());
        return;
      }
      chunks.push(chunk);
    };
    req.on("data", onData);
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function startHttpServer({
  port = Number(process.env.MCP_PORT) || 5004,
  host = process.env.MCP_HOST || "127.0.0.1",
  path = "/mcp",
  ...serverOptions
} = {}) {
  /** @type {Map<string, {transport: StreamableHTTPServerTransport, lastSeen: number}>} */
  const sessions = new Map();

  const reaper = setInterval(() => {
    const cutoff = Date.now() - SESSION_IDLE_MS;
    for (const [sid, entry] of sessions) {
      if (entry.lastSeen < cutoff) {
        sessions.delete(sid);
        entry.transport.close().catch(() => {});
      }
    }
  }, REAP_INTERVAL_MS);
  reaper.unref();

  const httpServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

      if (url.pathname === "/healthz") {
        res.writeHead(200, { "content-type": "text/plain" }).end("ok");
        return;
      }
      if (url.pathname !== path) {
        jsonError(res, 404, -32000, "Not found");
        return;
      }

      let parsedBody;
      if (req.method === "POST") {
        let raw;
        try {
          raw = await readBody(req, MAX_BODY_BYTES);
        } catch (err) {
          jsonError(
            res,
            err?.tooLarge ? 413 : 400,
            -32700,
            err?.tooLarge ? "Request body exceeds 256 KB" : "Failed to read request body"
          );
          return;
        }
        try {
          parsedBody = raw.length ? JSON.parse(raw) : undefined;
        } catch {
          jsonError(res, 400, -32700, "Parse error: invalid JSON");
          return;
        }
      }

      const sessionId = req.headers["mcp-session-id"];
      const entry = typeof sessionId === "string" ? sessions.get(sessionId) : undefined;

      let transport;
      if (entry) {
        entry.lastSeen = Date.now();
        transport = entry.transport;
      } else if (typeof sessionId === "string") {
        // Spec: unknown/expired session -> 404 so the client re-initializes.
        jsonError(res, 404, -32001, "Session not found");
        return;
      } else if (req.method === "POST" && isInitializeRequest(parsedBody)) {
        if (sessions.size >= MAX_SESSIONS) {
          jsonError(res, 503, -32000, "Too many concurrent sessions — try again later");
          return;
        }
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            sessions.set(sid, { transport, lastSeen: Date.now() });
          },
          onsessionclosed: (sid) => {
            sessions.delete(sid);
          },
        });
        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId);
        };
        const server = createCalcServer(serverOptions);
        await server.connect(transport);
      } else {
        jsonError(res, 400, -32000, "Bad request: no valid session and not an initialize request");
        return;
      }

      await transport.handleRequest(req, res, parsedBody);
    } catch (err) {
      console.error("request handling error:", err);
      jsonError(res, 500, -32603, "Internal server error");
    }
  });

  // Slowloris guards, same reasoning as the Go backend's http.Server bounds.
  httpServer.requestTimeout = 0; // long-lived SSE GETs are legitimate
  httpServer.headersTimeout = 10_000;

  return new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      const address = httpServer.address();
      resolve({
        httpServer,
        port: typeof address === "object" && address ? address.port : port,
        close: () =>
          new Promise((done) => {
            clearInterval(reaper);
            for (const [, e] of sessions) e.transport.close().catch(() => {});
            sessions.clear();
            httpServer.close(() => done());
            // Don't wait forever on idle keep-alive sockets.
            httpServer.closeAllConnections?.();
          }),
      });
    });
  });
}

// Run directly: `node src/http.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  const { port } = await startHttpServer();
  const host = process.env.MCP_HOST || "127.0.0.1";
  console.error(
    `calc-mcp Streamable HTTP server listening on http://${host}:${port}/mcp ` +
      `(upstream: ${process.env.CALC_API_BASE || DEFAULT_API_BASE})`
  );
}
