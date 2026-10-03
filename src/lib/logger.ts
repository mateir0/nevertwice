/**
 * Structured server-side logger — logging ONLY, no behavior.
 *
 * Writes one JSON object per line via console (Vercel picks these up in its
 * log viewer):
 *   { "ts": "<ISO timestamp>", "level": "info|warn|error", "event": "...", "data": {...} }
 *
 * SERVER-SIDE ONLY — never import this into client components (it would
 * ship console noise to browsers and confuse the client bundle audit).
 *
 * PII RULES (hard): never log personal data, API keys, key prefixes, full
 * question/answer content, or request bodies. Counts, reasons, latencies,
 * model names, status codes — never content. Scrubbed defensively below:
 * even if a caller passes something sensitive, it is redacted, not logged.
 */

export type LogLevel = "info" | "warn" | "error";

export type LogData = Record<string, unknown>;

const SENSITIVE_KEY = /^(authorization|api[_-]?key|x-api-key|secret|token|.*password.*|.*bearer.*)$/i;

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") {
    // Bearer tokens and Groq-style keys must never reach the logs, even if
    // a caller passes them by mistake. Truncation keeps messages short.
    if (/^Bearer\s+/i.test(value) || /^gsk_/.test(value)) return "[redacted]";
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (Array.isArray(value) || depth <= 0) return "[redacted-complex]";
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : scrubValue(v, depth - 1);
    }
    return out;
  }
  return value;
}

function scrub(data: LogData): LogData {
  const out: LogData = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : scrubValue(v, 3);
  }
  return out;
}

export function logEvent(level: LogLevel, event: string, data?: LogData): void {
  try {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      data: data ? scrub(data) : {},
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } catch {
    // Logging must never throw, never break the request path.
  }
}

/** Normal flow (requests, Groq calls, summaries). */
export function logInfo(event: string, data?: LogData): void {
  logEvent("info", event, data);
}

/** Degraded flow (bank fallback taken — the paper/drill still completes). */
export function logWarn(event: string, data?: LogData): void {
  logEvent("warn", event, data);
}

/** Failures (Groq errors, API errors). Short messages only — never logged here. */
export function logError(event: string, data?: LogData): void {
  logEvent("error", event, data);
}

/**
 * Classify a caught Groq-call failure for groq_request_error logging.
 * Reads ONLY the short error message (status-derived, e.g. "groq http 429")
 * — never response bodies, never anything that could carry content.
 */
export function classifyGroqError(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") return "timeout";
  const msg = err instanceof Error ? err.message : "";
  if (/abort/i.test(msg)) return "timeout";
  const http = msg.match(/groq http (\d+)/);
  if (http) {
    if (http[1] === "429") return "http_429";
    if (http[1] === "401") return "http_401";
    return "unknown";
  }
  if (err instanceof TypeError || /fetch failed|network|ECONN|ENOTFOUND|socket/i.test(msg)) {
    return "network";
  }
  if (/bad shape|no JSON array|empty array|bad (text|options|correctIndex|explanation)|duplicate options|Unexpected token/i.test(msg)) {
    return "parse";
  }
  return "unknown";
}
