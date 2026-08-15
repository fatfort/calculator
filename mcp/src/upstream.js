// Thin, hardened HTTP client for the calc API.
//
// The upstream error contract (see backend/main.go):
//   - Bad input, existing convention:  HTTP 200 with {"result":null,"error":"..."}
//   - Out-of-range input:              HTTP 400 with {"error":"..."}
//   - Success:                         HTTP 200 with {"result":...}
//
// Both bad-input shapes surface here as UpstreamInputError with the upstream
// message intact. Anything else (network failure, timeout, 5xx, unparseable
// body) is UpstreamUnavailableError. There are no retries: every endpoint is
// pure arithmetic, so a failure is either bad input (retrying won't help) or
// the service being down (the caller should be told, not stalled).

export const DEFAULT_API_BASE = "https://calc.fatfort.com/api";
export const DEFAULT_TIMEOUT_MS = 10_000;

// Mirrors maxRequestBody in backend/main.go. Enforced before sending so a
// caller gets a clear message instead of a connection reset mid-upload.
export const MAX_REQUEST_BODY_BYTES = 256 * 1024;

// The largest honest response is a Gaussian-elimination solution vector;
// 1 MB is far beyond that. Guards against a misconfigured CALC_API_BASE
// pointing at something that streams garbage.
export const MAX_RESPONSE_BODY_BYTES = 1024 * 1024;

/** The upstream API rejected the input (its message is preserved). */
export class UpstreamInputError extends Error {}

/** The upstream API could not be reached or returned something unusable. */
export class UpstreamUnavailableError extends Error {}

export function createUpstreamClient({
  apiBase = process.env.CALC_API_BASE || DEFAULT_API_BASE,
  fetchImpl = fetch,
  timeoutMs = Number(process.env.CALC_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
} = {}) {
  const base = apiBase.replace(/\/+$/, "");

  return async function call(endpoint, body) {
    const payload = JSON.stringify(body);
    if (Buffer.byteLength(payload) > MAX_REQUEST_BODY_BYTES) {
      throw new UpstreamInputError(
        "request body exceeds the calculator API's 256 KB limit — reduce the input size"
      );
    }

    let res;
    try {
      res = await fetchImpl(`${base}${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const reason =
        err?.name === "TimeoutError" || err?.name === "AbortError"
          ? `timed out after ${timeoutMs} ms`
          : err?.cause?.message || err?.message || String(err);
      throw new UpstreamUnavailableError(`calculator API unreachable: ${reason}`);
    }

    const lengthHeader = Number(res.headers.get("content-length"));
    if (Number.isFinite(lengthHeader) && lengthHeader > MAX_RESPONSE_BODY_BYTES) {
      throw new UpstreamUnavailableError(
        `calculator API response too large (${lengthHeader} bytes)`
      );
    }

    const text = await res.text();
    if (text.length > MAX_RESPONSE_BODY_BYTES) {
      throw new UpstreamUnavailableError(
        `calculator API response too large (${text.length} bytes)`
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }

    if (res.status === 400) {
      throw new UpstreamInputError(
        data?.error || "calculator API rejected the input (HTTP 400)"
      );
    }
    if (!res.ok) {
      throw new UpstreamUnavailableError(
        `calculator API returned HTTP ${res.status}`
      );
    }
    if (data === undefined || typeof data !== "object" || data === null) {
      // Covers e.g. the empty body Go's json.Encoder produces when it fails
      // to marshal an infinite float.
      throw new UpstreamUnavailableError(
        "calculator API returned an unparseable response"
      );
    }
    if (data.error) {
      throw new UpstreamInputError(data.error);
    }
    return data.result;
  };
}
