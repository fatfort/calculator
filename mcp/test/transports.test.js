// Both transports must expose an identical tool list — they are built from
// the same definition set (src/tools.js), and this test proves it end to end:
// a real child process over stdio, and a real HTTP server over Streamable HTTP.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { listToolDefinitions } from "../src/server.js";
import { startHttpServer } from "../src/http.js";

const mcpRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function listViaStdio() {
  const client = new Client({ name: "stdio-test", version: "0.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(mcpRoot, "src", "stdio.js")],
    cwd: mcpRoot,
    // Point at a dead upstream: tools/list must not require the calc API.
    env: { ...process.env, CALC_API_BASE: "http://127.0.0.1:1/api" },
  });
  await client.connect(transport);
  try {
    return (await client.listTools()).tools;
  } finally {
    await client.close();
  }
}

async function listViaHttp() {
  const { port, close } = await startHttpServer({
    port: 0,
    host: "127.0.0.1",
    apiBase: "http://127.0.0.1:1/api",
  });
  const client = new Client({ name: "http-test", version: "0.0.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${port}/mcp`)
  );
  try {
    await client.connect(transport);
    return (await client.listTools()).tools;
  } finally {
    await client.close().catch(() => {});
    await close();
  }
}

function normalize(tools) {
  return tools
    .map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

describe("transport parity", () => {
  test("stdio and Streamable HTTP expose the identical tool list", async () => {
    const [viaStdio, viaHttp] = await Promise.all([listViaStdio(), listViaHttp()]);
    assert.equal(viaStdio.length, listToolDefinitions().length);
    assert.deepEqual(normalize(viaStdio), normalize(viaHttp));
    assert.deepEqual(normalize(viaStdio), normalize(listToolDefinitions()));
  });

  test("HTTP transport enforces the session contract", async () => {
    const { port, close } = await startHttpServer({
      port: 0,
      host: "127.0.0.1",
      apiBase: "http://127.0.0.1:1/api",
    });
    try {
      // Non-initialize POST without a session -> 400.
      const noSession = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });
      assert.equal(noSession.status, 400);

      // Unknown session -> 404 (spec: client should re-initialize).
      const badSession = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-session-id": "no-such-session",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });
      assert.equal(badSession.status, 404);

      // Oversized body -> 413 before any parsing.
      const huge = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "x".repeat(300 * 1024),
      });
      assert.equal(huge.status, 413);

      // A real client handshake produces an Mcp-Session-Id and works end to end.
      const init = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "raw-test", version: "0" },
          },
        }),
      });
      assert.equal(init.status, 200);
      const sid = init.headers.get("mcp-session-id");
      assert.ok(sid, "initialize response must carry Mcp-Session-Id");
      await init.body?.cancel();

      // Session can be terminated with DELETE, after which it is gone.
      const del = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "DELETE",
        headers: { "mcp-session-id": sid },
      });
      assert.ok(del.status < 300, `DELETE failed: ${del.status}`);
      const afterDelete = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          "mcp-session-id": sid,
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      });
      assert.equal(afterDelete.status, 404);
    } finally {
      await close();
    }
  });
});
