import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCalcServer } from "../src/server.js";

/**
 * A fetch stub that records every upstream call and answers from `responder`.
 * responder(pathname, body) may return:
 *   - a plain value          -> 200 {"result": value}
 *   - {__status, __json}     -> that HTTP status with that JSON body
 *   - {__raw, __status?}     -> raw text body
 *   - a thrown error         -> network failure
 */
export function stubFetch(responder) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const pathname = new URL(url).pathname;
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), pathname, body });
    const r = await responder(pathname, body);
    if (r && typeof r === "object" && "__raw" in r) {
      return new Response(r.__raw, {
        status: r.__status ?? 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (r && typeof r === "object" && "__status" in r) {
      return new Response(JSON.stringify(r.__json), {
        status: r.__status,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ result: r }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { calls, fetchImpl };
}

/**
 * Wire a Client to a calc server over an in-memory transport pair, with the
 * upstream stubbed. Never touches the network.
 */
export async function connectedClient(responder) {
  const { calls, fetchImpl } = stubFetch(responder);
  const server = createCalcServer({
    apiBase: "http://stub.invalid/api",
    fetchImpl,
  });
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const close = async () => {
    await client.close();
    await server.close();
  };
  return { client, server, calls, close };
}
