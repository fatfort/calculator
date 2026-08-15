#!/usr/bin/env node
// stdio transport — for local MCP clients (Claude Code, Claude Desktop).
// Zero infrastructure: it just calls the public HTTPS API (or whatever
// CALC_API_BASE points at). Logs go to stderr; stdout is the protocol channel.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCalcServer } from "./server.js";
import { DEFAULT_API_BASE } from "./upstream.js";

const server = createCalcServer();
await server.connect(new StdioServerTransport());
console.error(
  `calc-mcp stdio server ready (upstream: ${process.env.CALC_API_BASE || DEFAULT_API_BASE})`
);
