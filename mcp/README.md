# calc-mcp

MCP (Model Context Protocol) server exposing the [calc.fatfort.com](https://calc.fatfort.com) calculator API as tools.

One tool definition set (`src/tools.js`), two transports:

| Transport | Entry point | For |
|---|---|---|
| **stdio** | `src/stdio.js` | Local MCP clients (Claude Code, Claude Desktop). Zero infrastructure — calls the public HTTPS API. |
| **Streamable HTTP** | `src/http.js` | Remote MCP clients, served at `https://calc.fatfort.com/mcp`. |

Built against `@modelcontextprotocol/sdk` 1.30.0 (MCP spec revision 2025-11-25; Streamable HTTP transport with `Mcp-Session-Id` session handling).

## Tools (22)

`gcd`, `lcm`, `is_prime`, `prime_factorization`, `divisor_count`, `is_perfect_number`, `fibonacci`, `factorial`, `combinations`, `permutations`, `zscore_to_percentile`, `percentile_to_zscore`, `convert_base`, `binary_octal_hex`, `convert_temperature`, `solve_quadratic`, `discriminant`, `collatz_length`, `convert_data_size`, `matrix_rank`, `matrix_determinant`, `solve_linear_system`

The four upstream temperature endpoints are folded into a single `convert_temperature` tool (any celsius/fahrenheit/kelvin pair; F↔K is chained through celsius). Everything else maps 1:1 to an upstream endpoint. Input bounds enforced by the API (`factorial` ≤ 20, `fibonacci` ≤ 92, trial-division tools ≤ 1e12, `collatz_length` 1–1e12) are mirrored in the JSON Schemas so clients reject out-of-range calls before any network round trip, with the *reason* for each bound stated in the tool description.

## Client configuration

### stdio (Claude Code, Claude Desktop, any local MCP client)

Requires Node ≥ 18 and `npm install` run once in this directory. Paste into your MCP client config (e.g. `claude_desktop_config.json`, or `.mcp.json` for Claude Code):

```json
{
  "mcpServers": {
    "calc": {
      "command": "node",
      "args": ["/path/to/calculator/mcp/src/stdio.js"],
      "env": {
        "CALC_API_BASE": "https://calc.fatfort.com/api"
      }
    }
  }
}
```

`CALC_API_BASE` may be omitted — `https://calc.fatfort.com/api` is the default.

Claude Code one-liner:

```sh
claude mcp add calc -- node /path/to/calculator/mcp/src/stdio.js
```

### Remote (Streamable HTTP)

For any remote-capable MCP client, no install needed:

```json
{
  "mcpServers": {
    "calc": {
      "type": "http",
      "url": "https://calc.fatfort.com/mcp"
    }
  }
}
```

Claude Code one-liner:

```sh
claude mcp add --transport http calc https://calc.fatfort.com/mcp
```

## Configuration

| Env var | Default | Meaning |
|---|---|---|
| `CALC_API_BASE` | `https://calc.fatfort.com/api` | Upstream calc API base URL. The container sets `http://calc:27439/api` (direct over the docker network). |
| `CALC_API_TIMEOUT_MS` | `10000` | Per-request upstream fetch timeout. |
| `MCP_PORT` | `5004` | HTTP transport listen port (`0` = ephemeral). |
| `MCP_HOST` | `127.0.0.1` | HTTP transport bind address (`0.0.0.0` inside the container). |

## Hardening

- Upstream fetches: 10 s timeout (`AbortSignal.timeout`), no retries, 1 MB response cap, request bodies pre-checked against the API's 256 KB cap.
- HTTP transport: 256 KB request body cap (413), max 100 concurrent sessions (503), 30-minute idle session reaper, DELETE terminates sessions, binds loopback by default and is published only on `127.0.0.1` in the compose file, `mem_limit`/`cpus` set.
- Upstream failures are surfaced as MCP tool errors with the upstream message intact — never a silent `null` result. Schema violations are rejected as JSON-RPC `InvalidParams` without touching the network.

## Running

```sh
# stdio (local)
node src/stdio.js

# HTTP (local, loopback:5004)
node src/http.js

# HTTP (container, for calc.fatfort.com/mcp)
docker compose up -d --build
```

Caddy wiring (not included here): add `reverse_proxy /mcp* calc-mcp:5004` (or a `handle /mcp*` block) to the `calc.fatfort.com` site block and `caddy reload`.

## Tests

No network access; the upstream is stubbed. Run inside `node:22-slim` if the host has no Node:

```sh
sudo docker run --rm -u 1002:1002 -e HOME=/tmp -v /path/to/calculator:/app -w /app/mcp node:22-slim npm test
```

Covers: every tool's schema validates a representative call; exact upstream endpoint + body field names per Go handler; schema-level bound rejection (client-side, zero network calls); upstream 400 / 200-with-error / network-down / unparseable-body paths; the 256 KB caps; and transport parity — a real stdio child process and a real Streamable HTTP server must expose identical tool lists, plus the HTTP session contract (session header on initialize, 400 no-session, 404 unknown-session, 413 oversize, DELETE termination).
