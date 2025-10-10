# Mathematical Tools - tools.abaj.ai

A comprehensive collection of 23 mathematical calculators and converters built with Go backend and vanilla JavaScript frontend.

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
- Location: `/var/www/tools.abaj.ai/backend/`
- Optimal algorithms with minimal time and space complexity
- RESTful API with JSON responses
- CORS enabled for cross-origin requests

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

### Building the Backend
```bash
cd /var/www/tools.abaj.ai/backend
go build -o backend main.go
```

### Systemd Service
The backend runs as a systemd service for persistence:

```ini
[Unit]
Description=Tools.abaj.ai Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/tools.abaj.ai/backend
ExecStart=/var/www/tools.abaj.ai/backend/backend
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Service location: `/etc/systemd/system/tools-backend.service`

Commands:
```bash
systemctl start tools-backend    # Start the service
systemctl stop tools-backend     # Stop the service
systemctl restart tools-backend  # Restart the service
systemctl status tools-backend   # Check status
systemctl enable tools-backend   # Enable on boot
```

### Nginx Configuration
Location: `/etc/nginx/sites-available/tools`

- HTTPS with Let's Encrypt SSL certificates
- HTTP to HTTPS redirect
- Frontend served from `/var/www/tools.abaj.ai/frontend`
- API proxied to backend on port 27439

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
- Nginx (for production)

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

