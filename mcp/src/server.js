// MCP server construction — shared by both transports.
//
// stdio (src/stdio.js) and Streamable HTTP (src/http.js) both call
// createCalcServer(), so the tool list and behavior are identical by
// construction; the transports differ only in how bytes move.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import AjvModule from "ajv";
import { TOOLS } from "./tools.js";
import {
  createUpstreamClient,
  UpstreamInputError,
  UpstreamUnavailableError,
} from "./upstream.js";

const Ajv = AjvModule.default ?? AjvModule;

export const SERVER_INFO = {
  name: "calc-fatfort",
  title: "FatFort Calculator",
  version: "1.0.0",
};

/** The tool list exactly as advertised over tools/list — used by tests too. */
export function listToolDefinitions() {
  return TOOLS.map(({ name, title, description, inputSchema }) => ({
    name,
    title,
    description,
    inputSchema,
  }));
}

export function createCalcServer(options = {}) {
  const call = createUpstreamClient(options);

  const ajv = new Ajv({ allErrors: true, strict: false });
  const registry = new Map(
    TOOLS.map((tool) => [tool.name, { tool, validate: ajv.compile(tool.inputSchema) }])
  );

  const server = new Server(SERVER_INFO, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listToolDefinitions(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    const entry = registry.get(name);
    if (!entry) {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    // Schema violations are protocol errors (InvalidParams), matching the
    // SDK's own behavior for schema-validated tools. Out-of-range values the
    // schema can express (factorial n=21, fibonacci n=93, ...) are therefore
    // rejected here without ever touching the network.
    if (!entry.validate(args)) {
      const details = ajv.errorsText(entry.validate.errors, { dataVar: "arguments" });
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid arguments for tool "${name}": ${details}`
      );
    }

    try {
      const result = await entry.tool.run(args, call);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      // Upstream failures are *tool* errors (isError result), never silent
      // nulls: the model sees the upstream message and can correct its input.
      if (err instanceof UpstreamInputError) {
        return {
          content: [
            { type: "text", text: `Calculator API rejected the input: ${err.message}` },
          ],
          isError: true,
        };
      }
      if (err instanceof UpstreamUnavailableError) {
        return {
          content: [
            {
              type: "text",
              text: `Calculator API is unavailable: ${err.message}. This is a service problem, not an input problem — retrying with different arguments will not help.`,
            },
          ],
          isError: true,
        };
      }
      throw err;
    }
  });

  return server;
}
