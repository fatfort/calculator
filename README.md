# Calc — calc.fatfort.com

Twenty-four mathematical calculators and converters. Free, no account, three
ways to reach them:

| | Where | For |
|---|---|---|
| **Web** | <https://calc.fatfort.com> | A browser |
| **MCP** | `https://calc.fatfort.com/mcp` | Claude and other AI clients — see below |
| **CLI** | [`cli/`](cli/) | A terminal, with Television / sesh / tmux wiring |

## Use it from Claude

The calculators are exposed as [MCP](https://modelcontextprotocol.io) tools, so
an AI client can call them directly instead of doing arithmetic in its head.
Twenty-two tools, each carrying the input bounds in its schema — so a request
for `factorial(100)` is refused before it is ever sent, with the reason (21!
overflows a 64-bit integer) rather than a bare rejection.

**Remote — nothing to install:**

```sh
claude mcp add --transport http calc https://calc.fatfort.com/mcp
```

Or in a client's config file:

```json
{ "mcpServers": { "calc": { "url": "https://calc.fatfort.com/mcp" } } }
```

**Local, over stdio** — if you'd rather run it yourself, see [`mcp/`](mcp/).
Both transports serve an identical tool list from one definition set.

The endpoint is public and unauthenticated, because the API it wraps is: these
are pure functions over numbers, holding no data and no credentials.



Built with a Go backend and a vanilla-JavaScript frontend, no build step.

## Features

### Number Theory
- **GCD Calculator** - Greatest Common Divisor using Euclidean algorithm
- **LCM Calculator** - Least Common Multiple
- **Primality Checker** - Check if a number is prime
- **Prime Factorization** - Find all prime factors of a number
- **Divisor Counter** - Count the number of divisors
- **Perfect Number Checker** - Check if a number is perfect

### Sequences & Combinatorics
- **Fibonacci Calculator** - Calculate nth Fibonacci number
- **Factorial Calculator** - Calculate n!
- **Combinations (nCr)** - Calculate binomial coefficients
- **Permutations (nPr)** - Calculate permutations
- **Collatz Sequence Length** - Calculate Collatz sequence steps

### Statistics
- **Z-Score to Percentile** - Convert z-score to percentile
- **Percentile to Z-Score** - Convert percentile to z-score

### Base Converters
- **Arbitrary Base Converter** - Convert between any bases (2-36)
- **Binary/Hex/Octal Converter** - Quick conversion between common bases

### Temperature Converters
- **Fahrenheit ↔ Celsius** - Temperature conversion
- **Celsius ↔ Kelvin** - Temperature conversion

### Data Size Converter
- **Data Size Converter** - Give a value in any of bits, bytes, KB, MB, GB, TB and get all six back

### Algebra
- **Quadratic Solver** - Solve ax² + bx + c = 0 (supports complex roots)
- **Discriminant Calculator** - Calculate b² - 4ac

### Linear Algebra
- **Matrix Rank** - Calculate the rank of any matrix
- **Matrix Determinant** - Calculate determinant of square matrices
- **Gaussian Elimination** - Solve systems of linear equations (Ax = b)

## Architecture

### Backend (Go)
- Port: 27439
- Location: `backend/` (deployed at `/home/liminf/calc` on the fatfort box)
- Optimal algorithms with minimal time and space complexity
- RESTful API with JSON responses
- CORS enabled for cross-origin requests

### Input ceilings
This API is public and unauthenticated and shares a host with two
mission-critical sites, so `main.go` bounds the inputs that are either
expensive or wrong past a certain size. See the `max*` constants there:

| Endpoint(s) | Bound | Why |
|---|---|---|
| `/factorial` | n ≤ 20 | 21! silently overflows int64 |
| `/fibonacci` | n ≤ 92 | fib(93) silently overflows int64 |
| `/prime`, `/prime-factorization`, `/divisor-count`, `/perfect-number` | n ≤ 1e12 | trial division runs to √n; at the int64 ceiling that is ~1.5e9 iterations of pinned CPU per request |
| `/collatz` | 1 ≤ n ≤ 1e12 | above this `3n+1` overflows into the negative −1 → −2 → −1 cycle and the loop **never terminates** |

Out-of-range input returns HTTP 400. There is also a 256 KB request body cap
and full `http.Server` timeouts — the original used `http.ListenAndServe` with
neither, which left it open to slowloris.

### Frontend
- Static HTML/CSS/JavaScript
- Responsive grid layout
- Modern UI with hover effects
- Organized by category with section headers

### Icons
- Multiple favicon formats for all devices
- Sizes: 16x16 to 512x512
- SVG support for scalable display
- Apple touch icon, Android chrome icons, MS tiles

## Deployment

Docker Compose on the fatfort box. The old systemd unit (`tools-backend.service`,
which ran as `User=root`) and the OpenResty vhost are both retired — the
container runs as uid 1002 with `mem_limit: 64m` and `cpus: 0.5`.

```bash
cd /home/liminf/calc
docker compose build && docker compose up -d
```

The `cpus` limit is load-bearing rather than decorative: it is the backstop that
holds even if a future endpoint forgets its input bound, so this service can
never steal more than half a core from the other tenants on the box.

### Edge (Caddy)
The container serves **only** `/api/*`. Caddy `file_server`s `frontend/`
directly and reverse-proxies the API, the same split `fatfort.com` uses:

```
calc.fatfort.com {
    handle /api/* {
        reverse_proxy calc:27439
    }
    root * /srv/calc/frontend
    file_server
}
```

Caddy config lives in the shared `/home/limsup/tutorsfirst/infra/Caddyfile`,
which also serves tutorsfirst.com.au and arcade.express — **edit it in place
with `cp`/`tee` (never `mv`), validate before reloading, and reload rather than
restart.** TLS needs no ACME: the pinned Cloudflare Origin cert already covers
`*.fatfort.com`.

## Algorithm Complexity

All calculators use optimal algorithms:

| Function | Time Complexity | Space Complexity |
|----------|----------------|------------------|
| GCD | O(log(min(a,b))) | O(1) |
| LCM | O(log(min(a,b))) | O(1) |
| Prime Check | O(√n) | O(1) |
| Prime Factorization | O(√n) | O(log n) |
| Divisor Count | O(√n) | O(1) |
| Perfect Number | O(√n) | O(1) |
| Fibonacci | O(n) | O(1) |
| Factorial | O(n) | O(1) |
| Combinations | O(r) | O(1) |
| Permutations | O(r) | O(1) |
| Z-Score Conversions | O(1) | O(1) |
| Base Conversion | O(log n) | O(log n) |
| Temperature | O(1) | O(1) |
| Quadratic | O(1) | O(1) |
| Collatz | O(n) | O(1) |
| Matrix Rank | O(n²m) | O(nm) |
| Matrix Determinant | O(n³) | O(n²) |
| Gaussian Elimination | O(n³) | O(n²) |

## API Endpoints

All endpoints accept POST requests with JSON payloads:

### Number Theory
- `/gcd` - `{"a": int, "b": int}`
- `/lcm` - `{"a": int, "b": int}`
- `/prime` - `{"n": int}`
- `/prime-factorization` - `{"n": int}`
- `/divisor-count` - `{"n": int}`
- `/perfect-number` - `{"n": int}`

### Sequences & Combinatorics
- `/fibonacci` - `{"n": int}`
- `/factorial` - `{"n": int}`
- `/combinations` - `{"n": int, "r": int}`
- `/permutations` - `{"n": int, "r": int}`
- `/collatz` - `{"n": int}`

### Statistics
- `/zscore-to-percentile` - `{"z": float}`
- `/percentile-to-zscore` - `{"p": float}`

### Base Converters
- `/base-converter` - `{"value": string, "fromBase": int, "toBase": int}`
- `/bin-hex-oct` - `{"value": string, "type": "bin"|"oct"|"hex"}`

### Temperature
- `/fahrenheit-to-celsius` - `{"f": float}`
- `/celsius-to-fahrenheit` - `{"c": float}`
- `/celsius-to-kelvin` - `{"c": float}`
- `/kelvin-to-celsius` - `{"k": float}`

### Data Size
- `/data-size-convert` - `{"value": float, "unit": "bits"|"bytes"|"KB"|"MB"|"GB"|"TB"}` — returns all six units at once

### Algebra
- `/quadratic-solver` - `{"a": float, "b": float, "c": float}`
- `/discriminant` - `{"a": float, "b": float, "c": float}`

### Linear Algebra
- `/matrix-rank` - `{"matrix": [[float]]}`
- `/matrix-determinant` - `{"matrix": [[float]]}`
- `/gaussian-elimination` - `{"matrix": [[float]], "vector": [float]}`

## Development

### Requirements
- Go 1.19 or higher
- Modern web browser
- Docker + Caddy (for production)

### Local Development
```bash
cd backend
go run main.go
```

Then open `frontend/index.html` in a browser, or serve with:
```bash
python3 -m http.server 8000
```

## License

Copyright © 2025 Abaj.ai

