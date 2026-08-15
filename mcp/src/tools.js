// Tool definitions for the calc.fatfort.com calculator API.
//
// This is the single source of truth for the tool surface: both the stdio and
// the Streamable HTTP transports serve exactly this list (see server.js).
//
// Every schema mirrors the input bounds that backend/main.go enforces with
// HTTP 400 (factorial n <= 20, fibonacci n <= 92, trial-division endpoints
// n <= 1e12, collatz 1 <= n <= 1e12), so a well-behaved client can reject
// out-of-range calls before a network round trip ever happens. The reasons
// for each bound are stated in the descriptions — a caller that knows *why*
// 21! is rejected asks a better follow-up question than one that just gets
// a 400.
//
// Each tool's `run(args, call)` receives a `call(endpoint, body)` function
// that POSTs to the upstream API (see upstream.js). Field names in the bodies
// below are copied from the Go handler structs in backend/main.go — they are
// the wire contract, do not "normalize" them.

const int64Note =
  "Values are 64-bit integers upstream; JavaScript callers should stay within " +
  "the exact-integer range (|n| <= 2^53 - 1).";

export const TOOLS = [
  {
    name: "gcd",
    title: "Greatest common divisor",
    description:
      "Compute the greatest common divisor of two integers using the Euclidean " +
      "algorithm. Use when you need the largest integer dividing both a and b — " +
      "e.g. to reduce a fraction or check coprimality (gcd = 1). " + int64Note,
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "integer", description: "First integer." },
        b: { type: "integer", description: "Second integer." },
      },
      required: ["a", "b"],
      additionalProperties: false,
    },
    run: ({ a, b }, call) => call("/gcd", { a, b }),
  },
  {
    name: "lcm",
    title: "Least common multiple",
    description:
      "Compute the least common multiple of two integers. Use when you need the " +
      "smallest positive integer divisible by both a and b — e.g. common " +
      "denominators or cycle alignment. Returns 0 if either input is 0. Beware " +
      "that lcm of two large values can silently overflow the upstream 64-bit " +
      "arithmetic; keep a*b within +/- 2^63. " + int64Note,
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "integer", description: "First integer." },
        b: { type: "integer", description: "Second integer." },
      },
      required: ["a", "b"],
      additionalProperties: false,
    },
    run: ({ a, b }, call) => call("/lcm", { a, b }),
  },
  {
    name: "is_prime",
    title: "Primality check",
    description:
      "Test whether an integer is prime (returns true/false). Numbers below 2 " +
      "are not prime. Use for exact primality answers instead of reasoning it " +
      "out. n is capped at 1e12 because the upstream check is trial division to " +
      "sqrt(n) — beyond that it would burn seconds of CPU per call, so larger " +
      "inputs are rejected rather than answered slowly.",
    inputSchema: {
      type: "object",
      properties: {
        n: {
          type: "integer",
          maximum: 1e12,
          description:
            "Integer to test. Max 1e12 (trial-division cost grows with sqrt(n)).",
        },
      },
      required: ["n"],
      additionalProperties: false,
    },
    run: ({ n }, call) => call("/prime", { n }),
  },
  {
    name: "prime_factorization",
    title: "Prime factorization",
    description:
      "Factor an integer into primes. Returns a map of prime -> exponent (e.g. " +
      "360 -> {\"2\":3,\"3\":2,\"5\":1}); numbers below 2 return an empty map. " +
      "Use when you need the actual factor decomposition, not just primality. " +
      "n is capped at 1e12 because factoring uses trial division to sqrt(n); " +
      "larger inputs are rejected rather than pinning a CPU core.",
    inputSchema: {
      type: "object",
      properties: {
        n: {
          type: "integer",
          maximum: 1e12,
          description:
            "Integer to factor. Max 1e12 (trial-division cost grows with sqrt(n)).",
        },
      },
      required: ["n"],
      additionalProperties: false,
    },
    run: ({ n }, call) => call("/prime-factorization", { n }),
  },
  {
    name: "divisor_count",
    title: "Count divisors",
    description:
      "Count the positive divisors of an integer (e.g. 12 has 6: " +
      "1,2,3,4,6,12). Non-positive inputs return 0. Use for divisor-function " +
      "questions without enumerating divisors yourself. n is capped at 1e12 " +
      "because counting scans divisors up to sqrt(n); larger inputs are " +
      "rejected rather than answered slowly.",
    inputSchema: {
      type: "object",
      properties: {
        n: {
          type: "integer",
          maximum: 1e12,
          description:
            "Integer whose divisors are counted. Max 1e12 (sqrt(n) scan).",
        },
      },
      required: ["n"],
      additionalProperties: false,
    },
    run: ({ n }, call) => call("/divisor-count", { n }),
  },
  {
    name: "is_perfect_number",
    title: "Perfect number check",
    description:
      "Test whether an integer equals the sum of its proper divisors (6, 28, " +
      "496, 8128, ...). Returns true/false; values below 2 return false. n is " +
      "capped at 1e12 because the divisor-sum scan runs to sqrt(n); larger " +
      "inputs are rejected rather than answered slowly.",
    inputSchema: {
      type: "object",
      properties: {
        n: {
          type: "integer",
          maximum: 1e12,
          description: "Integer to test. Max 1e12 (sqrt(n) divisor scan).",
        },
      },
      required: ["n"],
      additionalProperties: false,
    },
    run: ({ n }, call) => call("/perfect-number", { n }),
  },
  {
    name: "fibonacci",
    title: "Fibonacci number",
    description:
      "Compute the nth Fibonacci number exactly (fib(0)=0, fib(1)=1). Use " +
      "instead of computing the sequence by hand. n must be between 0 and 92: " +
      "fib(93) = 12200160415121876738 overflows the upstream signed 64-bit " +
      "integer, so larger n would return a silently wrong number and is " +
      "rejected instead. For fib(n) with n > 92 you need arbitrary-precision " +
      "arithmetic, which this API does not provide.",
    inputSchema: {
      type: "object",
      properties: {
        n: {
          type: "integer",
          minimum: 0,
          maximum: 92,
          description: "Index of the Fibonacci number, 0-92 (fib(93) overflows int64).",
        },
      },
      required: ["n"],
      additionalProperties: false,
    },
    run: ({ n }, call) => call("/fibonacci", { n }),
  },
  {
    name: "factorial",
    title: "Factorial",
    description:
      "Compute n! exactly. n must be between 0 and 20: 20! = 2432902008176640000 " +
      "is the largest factorial that fits a signed 64-bit integer — 21! " +
      "overflows, so larger n would return a silently wrong number and is " +
      "rejected instead. For n > 20 you need arbitrary-precision arithmetic, " +
      "which this API does not provide (consider computing log10(n!) or using " +
      "Stirling's approximation yourself).",
    inputSchema: {
      type: "object",
      properties: {
        n: {
          type: "integer",
          minimum: 0,
          maximum: 20,
          description: "Value to take the factorial of, 0-20 (21! overflows int64).",
        },
      },
      required: ["n"],
      additionalProperties: false,
    },
    run: ({ n }, call) => call("/factorial", { n }),
  },
  {
    name: "combinations",
    title: "Combinations (n choose r)",
    description:
      "Compute C(n, r), the number of ways to choose r items from n without " +
      "regard to order. Returns 0 when r > n. Use for exact binomial " +
      "coefficients. Caveat: the upstream arithmetic is 64-bit, so very large " +
      "results (roughly C(67,33) and beyond) can overflow silently — for huge " +
      "n prefer logarithms.",
    inputSchema: {
      type: "object",
      properties: {
        n: { type: "integer", minimum: 0, description: "Total number of items." },
        r: { type: "integer", minimum: 0, description: "Number of items chosen." },
      },
      required: ["n", "r"],
      additionalProperties: false,
    },
    run: ({ n, r }, call) => call("/combinations", { n, r }),
  },
  {
    name: "permutations",
    title: "Permutations (n permute r)",
    description:
      "Compute P(n, r) = n!/(n-r)!, the number of ordered arrangements of r " +
      "items from n. Returns 0 when r > n. Use for exact permutation counts. " +
      "Caveat: the upstream arithmetic is 64-bit, so large results (P(21,21) " +
      "already exceeds int64) can overflow silently.",
    inputSchema: {
      type: "object",
      properties: {
        n: { type: "integer", minimum: 0, description: "Total number of items." },
        r: { type: "integer", minimum: 0, description: "Number of items arranged." },
      },
      required: ["n", "r"],
      additionalProperties: false,
    },
    run: ({ n, r }, call) => call("/permutations", { n, r }),
  },
  {
    name: "zscore_to_percentile",
    title: "Z-score to percentile",
    description:
      "Convert a standard-normal z-score to a percentile (0-100). E.g. z=1.96 " +
      "-> ~97.5. Use for normal-distribution probability questions instead of " +
      "recalling CDF tables.",
    inputSchema: {
      type: "object",
      properties: {
        z: { type: "number", description: "Standard-normal z-score." },
      },
      required: ["z"],
      additionalProperties: false,
    },
    run: ({ z }, call) => call("/zscore-to-percentile", { z }),
  },
  {
    name: "percentile_to_zscore",
    title: "Percentile to z-score",
    description:
      "Convert a percentile (strictly between 0 and 100) to the standard-normal " +
      "z-score, e.g. 97.5 -> ~1.96. The bounds are exclusive because exactly 0 " +
      "or 100 corresponds to an infinite z-score, which cannot be represented " +
      "in the JSON response.",
    inputSchema: {
      type: "object",
      properties: {
        p: {
          type: "number",
          exclusiveMinimum: 0,
          exclusiveMaximum: 100,
          description:
            "Percentile, 0 < p < 100 (0 and 100 map to infinite z-scores).",
        },
      },
      required: ["p"],
      additionalProperties: false,
    },
    run: ({ p }, call) => call("/percentile-to-zscore", { p }),
  },
  {
    name: "convert_base",
    title: "Number base conversion",
    description:
      "Convert a non-negative integer between arbitrary bases 2-36 (digits " +
      "0-9, A-Z). Input and output are strings, so large values keep exact " +
      "digits. Use for any radix conversion — for the common bin/oct/hex " +
      "round-up in one call, prefer the binary_octal_hex tool.",
    inputSchema: {
      type: "object",
      properties: {
        value: {
          type: "string",
          minLength: 1,
          description:
            "The number to convert, written in fromBase (e.g. \"FF\", \"1011\").",
        },
        fromBase: {
          type: "integer",
          minimum: 2,
          maximum: 36,
          description: "Base the input is written in, 2-36.",
        },
        toBase: {
          type: "integer",
          minimum: 2,
          maximum: 36,
          description: "Base to convert to, 2-36.",
        },
      },
      required: ["value", "fromBase", "toBase"],
      additionalProperties: false,
    },
    run: ({ value, fromBase, toBase }, call) =>
      call("/base-converter", { value, fromBase, toBase }),
  },
  {
    name: "binary_octal_hex",
    title: "Binary / octal / hex representations",
    description:
      "Given a number written in binary, octal, or hex, return all four common " +
      "representations at once (binary, octal, hex, decimal). Use when you " +
      "want the full set in one call — e.g. reading a permission mask or a " +
      "register value. For decimal input or unusual bases, use convert_base " +
      "instead (this tool does not accept decimal input).",
    inputSchema: {
      type: "object",
      properties: {
        value: {
          type: "string",
          minLength: 1,
          description: "The number, written in the base named by `type`.",
        },
        type: {
          type: "string",
          enum: ["bin", "oct", "hex"],
          description: "Base the input is written in.",
        },
      },
      required: ["value", "type"],
      additionalProperties: false,
    },
    run: ({ value, type }, call) => call("/bin-hex-oct", { value, type }),
  },
  {
    name: "convert_temperature",
    title: "Temperature conversion",
    description:
      "Convert a temperature between celsius, fahrenheit, and kelvin. Any " +
      "from/to pair is accepted; conversions not offered directly by the " +
      "upstream API (fahrenheit<->kelvin) are chained through celsius using " +
      "two API calls, which is mathematically exact. Returns the converted " +
      "value as a number.",
    inputSchema: {
      type: "object",
      properties: {
        value: { type: "number", description: "Temperature to convert." },
        from: {
          type: "string",
          enum: ["celsius", "fahrenheit", "kelvin"],
          description: "Unit the input is in.",
        },
        to: {
          type: "string",
          enum: ["celsius", "fahrenheit", "kelvin"],
          description: "Unit to convert to.",
        },
      },
      required: ["value", "from", "to"],
      additionalProperties: false,
    },
    run: async ({ value, from, to }, call) => {
      if (from === to) return value;
      let celsius = value;
      if (from === "fahrenheit") celsius = await call("/fahrenheit-to-celsius", { f: value });
      else if (from === "kelvin") celsius = await call("/kelvin-to-celsius", { k: value });
      if (to === "celsius") return celsius;
      if (to === "fahrenheit") return call("/celsius-to-fahrenheit", { c: celsius });
      return call("/celsius-to-kelvin", { c: celsius });
    },
  },
  {
    name: "solve_quadratic",
    title: "Quadratic equation solver",
    description:
      "Solve a*x^2 + b*x + c = 0. Returns the discriminant plus either " +
      "realRoots (one or two numbers) or complexRoots (a conjugate pair, as " +
      "strings). If a = 0 it degrades to solving the linear equation b*x + c " +
      "= 0. Use for any quadratic — this also reports the discriminant, so a " +
      "separate discriminant call is only needed when you want just that " +
      "number.",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number", description: "Coefficient of x^2." },
        b: { type: "number", description: "Coefficient of x." },
        c: { type: "number", description: "Constant term." },
      },
      required: ["a", "b", "c"],
      additionalProperties: false,
    },
    run: ({ a, b, c }, call) => call("/quadratic-solver", { a, b, c }),
  },
  {
    name: "discriminant",
    title: "Quadratic discriminant",
    description:
      "Compute b^2 - 4ac for a quadratic a*x^2 + b*x + c. Positive means two " +
      "distinct real roots, zero one repeated root, negative a complex pair. " +
      "Use when you only need the discriminant; use solve_quadratic when you " +
      "want the roots too (it includes the discriminant in its output).",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number", description: "Coefficient of x^2." },
        b: { type: "number", description: "Coefficient of x." },
        c: { type: "number", description: "Constant term." },
      },
      required: ["a", "b", "c"],
      additionalProperties: false,
    },
    run: ({ a, b, c }, call) => call("/discriminant", { a, b, c }),
  },
  {
    name: "collatz_length",
    title: "Collatz sequence length",
    description:
      "Count the steps for n to reach 1 under the Collatz rule (halve if even, " +
      "3n+1 if odd). E.g. 27 takes 111 steps. n must be between 1 and 1e12: " +
      "below that bound 3n+1 cannot overflow 64-bit arithmetic and every " +
      "trajectory terminates quickly; beyond it an overflow could send the " +
      "sequence into a negative cycle that never reaches 1, so larger inputs " +
      "are rejected.",
    inputSchema: {
      type: "object",
      properties: {
        n: {
          type: "integer",
          minimum: 1,
          maximum: 1e12,
          description: "Starting value, 1 to 1e12 (larger risks int64 overflow mid-sequence).",
        },
      },
      required: ["n"],
      additionalProperties: false,
    },
    run: ({ n }, call) => call("/collatz", { n }),
  },
  {
    name: "convert_data_size",
    title: "Data size conversion",
    description:
      "Convert a data size and get all six units back at once: bits, bytes, " +
      "kb, mb, gb, tb (binary multiples — 1 kb = 1024 bytes). Use for storage " +
      "and bandwidth arithmetic; one call answers every \"how many X is Y\" " +
      "variant for the same quantity.",
    inputSchema: {
      type: "object",
      properties: {
        value: { type: "number", minimum: 0, description: "Quantity to convert." },
        unit: {
          type: "string",
          enum: ["bits", "bytes", "kb", "mb", "gb", "tb"],
          description: "Unit the input quantity is in.",
        },
      },
      required: ["value", "unit"],
      additionalProperties: false,
    },
    run: ({ value, unit }, call) => call("/data-size-convert", { value, unit }),
  },
  {
    name: "matrix_rank",
    title: "Matrix rank",
    description:
      "Compute the rank of a real matrix (any shape) via row reduction with a " +
      "1e-10 tolerance. Use to check linear independence of rows/columns or " +
      "invertibility (full rank). Matrices are arrays of equal-length number " +
      "rows; the whole request must stay under the API's 256 KB body cap.",
    inputSchema: {
      type: "object",
      properties: {
        matrix: {
          type: "array",
          minItems: 1,
          items: { type: "array", minItems: 1, items: { type: "number" } },
          description: "Matrix as an array of equal-length rows of numbers.",
        },
      },
      required: ["matrix"],
      additionalProperties: false,
    },
    run: ({ matrix }, call) => call("/matrix-rank", { matrix }),
  },
  {
    name: "matrix_determinant",
    title: "Matrix determinant",
    description:
      "Compute the determinant of a square real matrix via LU decomposition " +
      "with partial pivoting (returns 0 for singular matrices). Non-square " +
      "input is rejected by the API. Use for invertibility checks, volume " +
      "scaling, or Cramer-style reasoning. The whole request must stay under " +
      "the API's 256 KB body cap.",
    inputSchema: {
      type: "object",
      properties: {
        matrix: {
          type: "array",
          minItems: 1,
          items: { type: "array", minItems: 1, items: { type: "number" } },
          description: "Square matrix as an array of equal-length rows.",
        },
      },
      required: ["matrix"],
      additionalProperties: false,
    },
    run: ({ matrix }, call) => call("/matrix-determinant", { matrix }),
  },
  {
    name: "solve_linear_system",
    title: "Linear system solver (Gaussian elimination)",
    description:
      "Solve A*x = b by Gaussian elimination with partial pivoting. Returns " +
      "{hasSolution, message, solution?} — inconsistent, underdetermined, and " +
      "singular systems come back with hasSolution=false and an explanatory " +
      "message rather than an error. A unique solution requires a square, " +
      "non-singular A. `vector` must have one entry per matrix row. The whole " +
      "request must stay under the API's 256 KB body cap.",
    inputSchema: {
      type: "object",
      properties: {
        matrix: {
          type: "array",
          minItems: 1,
          items: { type: "array", minItems: 1, items: { type: "number" } },
          description: "Coefficient matrix A, an array of equal-length rows.",
        },
        vector: {
          type: "array",
          minItems: 1,
          items: { type: "number" },
          description: "Right-hand-side vector b, one entry per row of A.",
        },
      },
      required: ["matrix", "vector"],
      additionalProperties: false,
    },
    run: ({ matrix, vector }, call) =>
      call("/gaussian-elimination", { matrix, vector }),
  },
];
