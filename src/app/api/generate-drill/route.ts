import { NextResponse } from "next/server";
import {
  buildDrillPrompt,
  parseStrictDrillJson,
  type DrillGenTarget,
} from "@/engine/question-generator";
// Server-only taxonomy import: topic/subtopic allowlist for prompt-injection
// defense. (The generic engine never imports the exam config; routes may.)
import { nustConfig } from "@/config/exams/nust";
// Structured logging only — no behavior change: same statuses, same bodies.
import { classifyGroqError, logError, logInfo, logWarn } from "@/lib/logger";

/**
 * POST /api/generate-drill — server-side Groq cloud link of the drill chain.
 *
 * The GROQ_API_KEY lives ONLY here: plain process.env (no NEXT_PUBLIC_
 * prefix, so it is never inlined into the client bundle), never logged,
 * never echoed in responses, never committed (see .env.example).
 * Any failure → non-2xx JSON error → the client falls back silently.
 */

export const dynamic = "force-dynamic";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Production flagship instruct ID, verified at
// https://console.groq.com/docs/models (Supported Models → Production Models)
// AND against GET /openai/v1/models for this key. Note: the docs-listed
// "llama-3.3-70b-versatile" is enterprise-gated and returns model_not_found
// for keys without that entitlement — gpt-oss-120b is the accessible
// flagship here. If the key gains Llama 3.3 70B access, swap this one line.
const GROQ_MODEL = "openai/gpt-oss-120b";

const VALID_ERRORS = new Set([
  "concept-gap",
  "misread",
  "time-pressure",
  "silly-mistake",
  "formula-error",
]);

/**
 * Prompt-injection allowlist: every topic/subtopic pair must exist in the
 * NET taxonomy. Attacker strings ("Ignore previous instructions…") never
 * reach the Groq prompt — they 400 here, before the rate limiter or Groq.
 * The legit client (drill-planner) only ever sends taxonomy pairs.
 */
const TOPIC_SUBTOPICS: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  nustConfig.sections.flatMap((s) => s.topics.map((t) => [t.name, new Set(t.subtopics)] as const)),
);

/** Oversized JSON bodies are rejected before validation (quota cheap). */
const MAX_BODY_BYTES = 8 * 1024;

// ---------- per-IP rate limiting (Groq quota guard) ----------
// SERVERLESS CAVEAT: these buckets are in-memory Maps — on Vercel each
// serverless instance holds its own Map, so the limiter is best-effort
// per instance, not a global counter. Groq's own 429 is the hard backstop:
// ANY Groq failure (429 included) falls through to the deterministic seed
// bank, so quota can never be forced and the feature never breaks.

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

/** Client IP: first entry of x-forwarded-for, else "unknown" (one bucket). */
function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

/**
 * True when this IP already used its 10 generations in the current hour.
 * Successful check consumes one slot. Expired windows reset on next hit;
 * stale buckets are swept opportunistically to bound memory.
 */
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    if (rateBuckets.size > 1000) {
      for (const [k, b] of rateBuckets) {
        if (now - b.windowStart >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(k);
      }
    }
    return false;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return true;
  bucket.count += 1;
  return false;
}

function validTargets(v: unknown): v is DrillGenTarget[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > 3) return false;
  let total = 0;
  for (const t of v) {
    if (typeof t !== "object" || t === null) return false;
    const r = t as Record<string, unknown>;
    // Length caps first (cheap), then taxonomy membership: unknown
    // topic/subtopic pairs are prompt-injection attempts — reject.
    if (typeof r.topic !== "string" || r.topic.length === 0 || r.topic.length > 100) return false;
    if (typeof r.subtopic !== "string" || r.subtopic.length === 0 || r.subtopic.length > 100) {
      return false;
    }
    const subs = TOPIC_SUBTOPICS.get(r.topic);
    if (!subs || !subs.has(r.subtopic)) return false;
    if (typeof r.errorType !== "string" || !VALID_ERRORS.has(r.errorType)) return false;
    if (!Number.isInteger(r.count) || (r.count as number) < 1 || (r.count as number) > 8) return false;
    total += r.count as number;
  }
  return total >= 1 && total <= 12;
}

async function callGroq(prompt: string, apiKey: string, timeoutMs = 30000) {
  const started = Date.now();
  logInfo("groq_request_start", { model: GROQ_MODEL });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a drill-question engine for NUST Entry Test prep. Output ONLY strict JSON — no markdown, no fences, no commentary. Write each question as a real exam stem. Never prefix with 'Drill', 'Practice', or topic names. Use Unicode math notation directly — superscripts (x², x³), √, π, θ, ×, ÷, ±, →, ∞. Never caret notation, LaTeX, backslashes, or delimiters.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        // Explanations cost tokens; drills cap at 12 questions.
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`groq http ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("groq bad shape");
    const items = parseStrictDrillJson(content);
    logInfo("groq_request_success", { model: GROQ_MODEL, latency_ms: Date.now() - started });
    return items;
  } catch (err) {
    // Short message only — never bodies, never anything content-bearing.
    const message = err instanceof Error ? err.message.slice(0, 200) : "unknown";
    logError("groq_request_error", {
      model: GROQ_MODEL,
      latency_ms: Date.now() - started,
      error_type: classifyGroqError(err),
      error_message: message,
    });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const ROUTE = "/api/generate-drill";

/**
 * Logging response wrapper — same status/body/headers as before, plus two
 * log lines: api_request on EVERY response, and api_error + the MOST
 * IMPORTANT line in the app (bank_fallback_triggered) on every failure.
 * Any non-2xx here sends the client down the verbatim bank fallback, so
 * every failure path logs it — no exceptions, no early returns that skip it.
 */
function respond(
  method: string,
  started: number,
  status: number,
  body: { error: string } | { items: unknown },
  reason?: string,
  headers?: Record<string, string>,
): NextResponse {
  logInfo("api_request", { route: ROUTE, method, status, latency_ms: Date.now() - started });
  if (status >= 400 && reason) {
    logError("api_error", { route: ROUTE, message: reason });
    logWarn("bank_fallback_triggered", { reason });
  }
  return NextResponse.json(body, headers ? { status, headers } : { status });
}

export async function POST(req: Request): Promise<NextResponse> {
  const started = Date.now();
  const method = req.method;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Key unset (e.g. local dev without Groq) — client skips to seed bank.
    return respond(method, started, 503, { error: "groq-unconfigured" }, "groq_unconfigured");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return respond(method, started, 400, { error: "bad-json" }, "validation_failed");
  }
  // Cheap size guard before any validation work (JSON bomb / quota waste).
  try {
    if (JSON.stringify(body)?.length > MAX_BODY_BYTES) {
      return respond(method, started, 413, { error: "body-too-large" }, "validation_failed");
    }
  } catch {
    return respond(method, started, 400, { error: "bad-json" }, "validation_failed");
  }
  const targets = (body as { targets?: unknown } | null)?.targets;
  if (!validTargets(targets)) {
    // Malformed (or off-taxonomy) requests never touch Groq and never
    // consume rate-limit quota.
    return respond(method, started, 400, { error: "bad-targets" }, "validation_failed");
  }

  // Quota guard BEFORE Groq: 10 generations per IP per hour. The client
  // treats 429 like any other failure and falls back to the seed bank.
  if (rateLimited(clientIp(req))) {
    return respond(
      method,
      started,
      429,
      { error: "rate-limited" },
      "rate_limited",
      { "retry-after": "3600" },
    );
  }

  const prompt = buildDrillPrompt(targets);
  try {
    const items = await callGroq(prompt, apiKey);
    return respond(method, started, 200, { items });
  } catch {
    try {
      // One retry, same prompt and validation.
      const items = await callGroq(prompt, apiKey);
      return respond(method, started, 200, { items });
    } catch (second) {
      const t = classifyGroqError(second);
      const reason = t === "http_429" ? "groq_429" : t === "timeout" ? "groq_timeout" : "groq_error";
      return respond(method, started, 502, { error: "groq-failed" }, reason);
    }
  }
}
