import { test, describe } from "node:test";
import assert from "node:assert/strict";
import AjvModule from "ajv";
import { TOOLS } from "../src/tools.js";
import { connectedClient } from "./helpers.js";

const Ajv = AjvModule.default ?? AjvModule;
const ajv = new Ajv({ allErrors: true, strict: false });

// One representative call per tool: the arguments a client would send, the
// upstream endpoint that must be hit, and the EXACT request body the Go
// handler in backend/main.go decodes (field names are the wire contract).
const CASES = [
  { tool: "gcd", args: { a: 12, b: 8 }, endpoint: "/gcd", body: { a: 12, b: 8 }, result: 4 },
  { tool: "lcm", args: { a: 4, b: 6 }, endpoint: "/lcm", body: { a: 4, b: 6 }, result: 12 },
  { tool: "is_prime", args: { n: 97 }, endpoint: "/prime", body: { n: 97 }, result: true },
  { tool: "prime_factorization", args: { n: 360 }, endpoint: "/prime-factorization", body: { n: 360 }, result: { 2: 3, 3: 2, 5: 1 } },
  { tool: "divisor_count", args: { n: 12 }, endpoint: "/divisor-count", body: { n: 12 }, result: 6 },
  { tool: "is_perfect_number", args: { n: 28 }, endpoint: "/perfect-number", body: { n: 28 }, result: true },
  { tool: "fibonacci", args: { n: 10 }, endpoint: "/fibonacci", body: { n: 10 }, result: 55 },
  { tool: "factorial", args: { n: 5 }, endpoint: "/factorial", body: { n: 5 }, result: 120 },
  { tool: "combinations", args: { n: 5, r: 2 }, endpoint: "/combinations", body: { n: 5, r: 2 }, result: 10 },
  { tool: "permutations", args: { n: 5, r: 2 }, endpoint: "/permutations", body: { n: 5, r: 2 }, result: 20 },
  { tool: "zscore_to_percentile", args: { z: 1.96 }, endpoint: "/zscore-to-percentile", body: { z: 1.96 }, result: 97.5 },
  { tool: "percentile_to_zscore", args: { p: 97.5 }, endpoint: "/percentile-to-zscore", body: { p: 97.5 }, result: 1.96 },
  // The most likely field-name bug: /base-converter takes `value`, NOT `number`.
  { tool: "convert_base", args: { value: "FF", fromBase: 16, toBase: 2 }, endpoint: "/base-converter", body: { value: "FF", fromBase: 16, toBase: 2 }, result: "11111111" },
  { tool: "binary_octal_hex", args: { value: "1010", type: "bin" }, endpoint: "/bin-hex-oct", body: { value: "1010", type: "bin" }, result: { binary: "1010", octal: "12", hex: "A", decimal: "10" } },
  { tool: "solve_quadratic", args: { a: 1, b: -3, c: 2 }, endpoint: "/quadratic-solver", body: { a: 1, b: -3, c: 2 }, result: { discriminant: 1, realRoots: [2, 1] } },
  { tool: "discriminant", args: { a: 1, b: -3, c: 2 }, endpoint: "/discriminant", body: { a: 1, b: -3, c: 2 }, result: 1 },
  { tool: "collatz_length", args: { n: 27 }, endpoint: "/collatz", body: { n: 27 }, result: 111 },
  // /data-size-convert takes {value, unit} and returns all six units at once.
  { tool: "convert_data_size", args: { value: 1, unit: "gb" }, endpoint: "/data-size-convert", body: { value: 1, unit: "gb" }, result: { bits: 8589934592, bytes: 1073741824, kb: 1048576, mb: 1024, gb: 1, tb: 0.0009765625 } },
  { tool: "matrix_rank", args: { matrix: [[1, 2], [2, 4]] }, endpoint: "/matrix-rank", body: { matrix: [[1, 2], [2, 4]] }, result: 1 },
  { tool: "matrix_determinant", args: { matrix: [[1, 2], [3, 4]] }, endpoint: "/matrix-determinant", body: { matrix: [[1, 2], [3, 4]] }, result: -2 },
  { tool: "solve_linear_system", args: { matrix: [[2, 0], [0, 3]], vector: [4, 9] }, endpoint: "/gaussian-elimination", body: { matrix: [[2, 0], [0, 3]], vector: [4, 9] }, result: { solution: [2, 3], message: "Unique solution found", hasSolution: true } },
];

describe("tool schemas", () => {
  test("every tool has a unique name, description, and object schema", () => {
    const names = new Set();
    for (const t of TOOLS) {
      assert.ok(!names.has(t.name), `duplicate tool name ${t.name}`);
      names.add(t.name);
      assert.ok(t.description.length > 40, `${t.name}: description too thin`);
      assert.equal(t.inputSchema.type, "object");
      assert.ok(t.inputSchema.required?.length > 0, `${t.name}: no required fields`);
      assert.equal(t.inputSchema.additionalProperties, false);
    }
  });

  test("every representative call validates against its published schema", () => {
    const byName = new Map(TOOLS.map((t) => [t.name, t]));
    // Every tool except convert_temperature has a CASES row; it is covered by
    // its own describe block below.
    const covered = new Set(CASES.map((c) => c.tool));
    covered.add("convert_temperature");
    for (const t of TOOLS) {
      assert.ok(covered.has(t.name), `no representative call for ${t.name}`);
    }
    for (const c of CASES) {
      const tool = byName.get(c.tool);
      assert.ok(tool, `unknown tool in CASES: ${c.tool}`);
      const validate = ajv.compile(tool.inputSchema);
      assert.ok(
        validate(c.args),
        `${c.tool}: representative args rejected by own schema: ${ajv.errorsText(validate.errors)}`
      );
    }
  });

  test("schemas encode the upstream bounds", () => {
    const schema = (name) => TOOLS.find((t) => t.name === name).inputSchema;
    assert.equal(schema("factorial").properties.n.maximum, 20);
    assert.equal(schema("factorial").properties.n.minimum, 0);
    assert.equal(schema("fibonacci").properties.n.maximum, 92);
    assert.equal(schema("fibonacci").properties.n.minimum, 0);
    for (const name of ["is_prime", "prime_factorization", "divisor_count", "is_perfect_number"]) {
      assert.equal(schema(name).properties.n.maximum, 1e12, name);
    }
    assert.equal(schema("collatz_length").properties.n.minimum, 1);
    assert.equal(schema("collatz_length").properties.n.maximum, 1e12);
    assert.equal(schema("convert_base").properties.fromBase.minimum, 2);
    assert.equal(schema("convert_base").properties.toBase.maximum, 36);
  });
});

describe("field names match the Go handlers", () => {
  for (const c of CASES) {
    test(`${c.tool} -> POST ${c.endpoint}`, async () => {
      const { client, calls, close } = await connectedClient(() => c.result);
      try {
        const res = await client.callTool({ name: c.tool, arguments: c.args });
        assert.equal(calls.length, 1, "exactly one upstream call");
        assert.equal(calls[0].pathname, `/api${c.endpoint}`);
        // Exact body match: extra, missing, or renamed fields all fail here.
        assert.deepEqual(calls[0].body, c.body);
        assert.notEqual(res.isError, true, JSON.stringify(res.content));
        assert.deepEqual(JSON.parse(res.content[0].text), c.result);
      } finally {
        await close();
      }
    });
  }
});

describe("convert_temperature", () => {
  test("direct pair uses a single upstream call with the right field name", async () => {
    const { client, calls, close } = await connectedClient((path, body) => {
      assert.equal(path, "/api/fahrenheit-to-celsius");
      assert.deepEqual(body, { f: 212 });
      return 100;
    });
    try {
      const res = await client.callTool({
        name: "convert_temperature",
        arguments: { value: 212, from: "fahrenheit", to: "celsius" },
      });
      assert.equal(calls.length, 1);
      assert.equal(JSON.parse(res.content[0].text), 100);
    } finally {
      await close();
    }
  });

  test("fahrenheit -> kelvin chains through celsius (two calls)", async () => {
    const { client, calls, close } = await connectedClient((path) => {
      if (path === "/api/fahrenheit-to-celsius") return 100;
      if (path === "/api/celsius-to-kelvin") return 373.15;
      assert.fail(`unexpected upstream call: ${path}`);
    });
    try {
      const res = await client.callTool({
        name: "convert_temperature",
        arguments: { value: 212, from: "fahrenheit", to: "kelvin" },
      });
      assert.deepEqual(
        calls.map((c) => [c.pathname, c.body]),
        [
          ["/api/fahrenheit-to-celsius", { f: 212 }],
          ["/api/celsius-to-kelvin", { c: 100 }],
        ]
      );
      assert.equal(JSON.parse(res.content[0].text), 373.15);
    } finally {
      await close();
    }
  });

  test("same-unit conversion is an identity with zero upstream calls", async () => {
    const { client, calls, close } = await connectedClient(() => {
      assert.fail("no upstream call expected");
    });
    try {
      const res = await client.callTool({
        name: "convert_temperature",
        arguments: { value: 21.5, from: "celsius", to: "celsius" },
      });
      assert.equal(calls.length, 0);
      assert.equal(JSON.parse(res.content[0].text), 21.5);
    } finally {
      await close();
    }
  });
});

describe("bound violations are rejected client-side, before any network call", () => {
  const violations = [
    { tool: "factorial", args: { n: 21 } },
    { tool: "factorial", args: { n: -1 } },
    { tool: "fibonacci", args: { n: 93 } },
    { tool: "is_prime", args: { n: 1e12 + 1 } },
    { tool: "collatz_length", args: { n: 0 } },
    { tool: "collatz_length", args: { n: 2e12 } },
    { tool: "convert_base", args: { value: "FF", fromBase: 37, toBase: 10 } },
    { tool: "percentile_to_zscore", args: { p: 100 } },
    { tool: "convert_data_size", args: { value: 1, unit: "petabytes" } },
    { tool: "gcd", args: { a: 12 } }, // missing required field
    { tool: "gcd", args: { a: "12", b: 8 } }, // wrong type
  ];

  for (const v of violations) {
    test(`${v.tool} ${JSON.stringify(v.args)} -> InvalidParams`, async () => {
      const { client, calls, close } = await connectedClient(() => {
        assert.fail("upstream must not be called for schema-invalid input");
      });
      try {
        await assert.rejects(
          client.callTool({ name: v.tool, arguments: v.args }),
          (err) => {
            assert.match(String(err.message), /Invalid arguments/);
            assert.equal(err.code, -32602); // JSON-RPC InvalidParams
            return true;
          }
        );
        assert.equal(calls.length, 0);
      } finally {
        await close();
      }
    });
  }
});

describe("upstream error paths", () => {
  test("HTTP 400 (out-of-range) surfaces the upstream message as a tool error", async () => {
    // The schema allows n = 1e12 for collatz, and the upstream may still say
    // no — simulate its exact 400 shape from backend/main.go.
    const { client, close } = await connectedClient(() => ({
      __status: 400,
      __json: { result: null, error: "n must be between 1 and 1e12" },
    }));
    try {
      const res = await client.callTool({
        name: "collatz_length",
        arguments: { n: 999999999999 },
      });
      assert.equal(res.isError, true);
      assert.match(res.content[0].text, /rejected the input/);
      assert.match(res.content[0].text, /n must be between 1 and 1e12/);
    } finally {
      await close();
    }
  });

  test("HTTP 200 with an error field surfaces the message, never a null result", async () => {
    const { client, close } = await connectedClient(() => ({
      __status: 200,
      __json: { result: null, error: "invalid digit for base 2" },
    }));
    try {
      const res = await client.callTool({
        name: "convert_base",
        arguments: { value: "777", fromBase: 2, toBase: 10 },
      });
      assert.equal(res.isError, true);
      assert.match(res.content[0].text, /invalid digit for base 2/);
      assert.doesNotMatch(res.content[0].text, /null/);
    } finally {
      await close();
    }
  });

  test("upstream down (network failure) is reported clearly as a tool error", async () => {
    const { client, close } = await connectedClient(() => {
      throw Object.assign(new TypeError("fetch failed"), {
        cause: new Error("connect ECONNREFUSED 127.0.0.1:27439"),
      });
    });
    try {
      const res = await client.callTool({ name: "gcd", arguments: { a: 12, b: 8 } });
      assert.equal(res.isError, true);
      assert.match(res.content[0].text, /unavailable/);
      assert.match(res.content[0].text, /ECONNREFUSED/);
    } finally {
      await close();
    }
  });

  test("unparseable upstream body (e.g. Go failing to encode Inf) is an error, not null", async () => {
    const { client, close } = await connectedClient(() => ({ __raw: "" }));
    try {
      const res = await client.callTool({
        name: "percentile_to_zscore",
        arguments: { p: 0.0000001 },
      });
      assert.equal(res.isError, true);
      assert.match(res.content[0].text, /unparseable/);
    } finally {
      await close();
    }
  });

  test("oversized request body is rejected before sending (256 KB cap)", async () => {
    const { client, calls, close } = await connectedClient(() => {
      assert.fail("must not reach the network");
    });
    try {
      // ~300 KB matrix serialization.
      const row = new Array(200).fill(1.2345678901234567);
      const matrix = new Array(90).fill(row);
      const res = await client.callTool({
        name: "matrix_rank",
        arguments: { matrix },
      });
      assert.equal(res.isError, true);
      assert.match(res.content[0].text, /256 KB/);
      assert.equal(calls.length, 0);
    } finally {
      await close();
    }
  });

  test("unknown tool is a protocol error", async () => {
    const { client, close } = await connectedClient(() => 0);
    try {
      await assert.rejects(
        client.callTool({ name: "does_not_exist", arguments: {} }),
        /Unknown tool|not found/i
      );
    } finally {
      await close();
    }
  });
});
