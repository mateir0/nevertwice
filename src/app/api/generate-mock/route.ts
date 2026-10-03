import { NextResponse } from "next/server";
import {
  buildMockPrompt,
  parseStrictDrillJson,
  MOCK_BATCH_MAX,
  type MockSubjectCount,
} from "@/engine/question-generator";
// Structured logging only — no behavior change: same statuses, same bodies.
import { classifyGroqError, logError, logInfo, logWarn } from "@/lib/logger";

/**
 * POST /api/generate-mock — server-side Groq cloud link of the full-mock chain.
 *
 * Mirrors /api/generate-drill with its own contract and its OWN rate-limit
 * bucket (mock batches never consume drill quota and vice versa). The
 * GROQ_API_KEY lives ONLY here: plain process.env (no NEXT_PUBLIC_
 * prefix, so it is never inlined into the client bundle), never logged,
 * never echoed in responses, never committed (see .env.example).
 * Any failure → non-2xx JSON error → the client falls back to verbatim
 * bank cycling for the batch.
 */

export const dynamic = "force-dynamic";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Same accessible flagship as the drill route (see generate-drill).
const GROQ_MODEL = "openai/gpt-oss-120b";

const VALID_SUBJECTS = new Set([
  "Mathematics",
  "Physics",
  "Chemistry",
  "English",
  "Intelligence",
]);

/** Oversized JSON bodies are rejected before validation (quota cheap). */
const MAX_BODY_BYTES = 4 * 1024;

// ---------- per-IP rate limiting (SEPARATE mock bucket) ----------
// SERVERLESS CAVEAT: these buckets are in-memory Maps — on Vercel each
// serverless instance holds its own Map, so the limiter is best-effort
// per instance, not a global counter. Groq's own 429 is the hard backstop:
// the route answers 429 with Retry-After and the client backs off once,
// then falls back to verbatim bank cycling — quota can never be forced
// and the paper always completes.

// One full mock ≈ 7 batches: 25 mock-batch requests per IP per hour
// allows ~3 full mocks/hour without touching the drill bucket.
const MOCK_RATE_LIMIT_MAX = 25;
const MOCK_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const mockRateBuckets = new Map<string, { count: number; windowStart: number }>();

// DAILY MOCK CAP: max 3 full mocks per IP per day. The token budget is
// shared with drills — one heavy mock day must never starve the drill
// pipeline (drills stay unlimited by this cap). Counted in batch requests:
// ~7 batches per full mock → 21 batches/day ≈ 3 mocks/day.
const MOCK_DAILY_MOCK_CAP = 3;
const MOCK_DAILY_MAX_BATCHES = MOCK_DAILY_MOCK_CAP * 7;
const MOCK_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const mockDailyBuckets = new Map<string, { count: number; dayStart: number }>();

/** Seconds until next UTC midnight — Retry-After for the daily cap. */
function secondsUntilMidnight(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

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
 * True when this IP already used its 25 mock batches in the current hour.
 * Successful check consumes one slot. Expired windows reset on next hit;
 * stale buckets are swept opportunistically to bound memory.
 */
function mockRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = mockRateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= MOCK_RATE_LIMIT_WINDOW_MS) {
    mockRateBuckets.set(ip, { count: 1, windowStart: now });
    if (mockRateBuckets.size > 1000) {
      for (const [k, b] of mockRateBuckets) {
        if (now - b.windowStart >= MOCK_RATE_LIMIT_WINDOW_MS) mockRateBuckets.delete(k);
      }
    }
    return false;
  }
  if (bucket.count >= MOCK_RATE_LIMIT_MAX) return true;
  bucket.count += 1;
  return false;
}

/**
 * True when this IP already used its ~3 full mocks (≈21 batches) in the
 * current 24h window. Successful check consumes one slot. Expired windows
 * reset on next hit; stale buckets are swept opportunistically.
 */
function mockDailyLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = mockDailyBuckets.get(ip);
  if (!bucket || now - bucket.dayStart >= MOCK_DAILY_WINDOW_MS) {
    mockDailyBuckets.set(ip, { count: 1, dayStart: now });
    if (mockDailyBuckets.size > 1000) {
      for (const [k, b] of mockDailyBuckets) {
        if (now - b.dayStart >= MOCK_DAILY_WINDOW_MS) mockDailyBuckets.delete(k);
      }
    }
    return false;
  }
  if (bucket.count >= MOCK_DAILY_MAX_BATCHES) return true;
  bucket.count += 1;
  return false;
}

function validSubjects(v: unknown): v is MockSubjectCount[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > MOCK_BATCH_MAX) return false;
  let total = 0;
  for (const s of v) {
    if (typeof s !== "object" || s === null) return false;
    const r = s as Record<string, unknown>;
    // Subject allowlist doubles as prompt-injection defense: only the five
    // NET subjects ever reach the Groq prompt. Length cap is belt-and-braces.
    if (typeof r.subject !== "string" || r.subject.length > 32 || !VALID_SUBJECTS.has(r.subject)) {
      return false;
    }
    if (!Number.isInteger(r.count) || (r.count as number) < 1 || (r.count as number) > MOCK_BATCH_MAX) return false;
    total += r.count as number;
  }
  return total >= 1 && total <= MOCK_BATCH_MAX;
}

async function callGroq(prompt: string, apiKey: string, timeoutMs = 60000) {
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
              "You are a mock-paper engine for full-length NUST Entry Test simulations. Output ONLY strict JSON — no markdown, no fences, no commentary. Write each question as a real exam stem. Never prefix with 'Mock', 'Practice', or subject names. Use Unicode math notation directly — superscripts (x², x³), √, π, θ, ×, ÷, ±, →, ∞. Never caret notation, LaTeX, backslashes, or delimiters.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        // Explanations cost tokens; mock batches cap at 12 questions.
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Preserve Groq 429s (per-minute limit) with their Retry-After so
      // the route can answer 429 and the client can back off + retry once.
      const retryAfter = res.status === 429 ? res.headers.get("retry-after") : null;
      throw Object.assign(new Error(`groq http ${res.status}`), {
        groqStatus: res.status,
        groqRetryAfter: retryAfter,
      });
    }
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

const ROUTE = "/api/generate-mock";

interface BatchCtx {
  method: string;
  started: number;
  batchIndex: number;
  subjects: MockSubjectCount[] | null;
}

/**
 * Summary-level ONLY: one line per batch request — counts and the subject
 * split, never per-question lines, never content.
 */
function logSummary(ctx: BatchCtx, ok: boolean): void {
  const subject_split: Record<string, number> = {};
  let total_questions = 0;
  for (const s of ctx.subjects ?? []) {
    subject_split[s.subject] = (subject_split[s.subject] ?? 0) + s.count;
    total_questions += s.count;
  }
  logInfo("mock_session_summary", {
    total_questions,
    groq_batches_ok: ok ? 1 : 0,
    fallback_batches: ok ? 0 : 1,
    subject_split,
  });
}

/**
 * Logging response wrapper — same status/body/headers as before, plus:
 * api_request on EVERY response; api_error + bank_fallback_triggered on
 * every failure EXCEPT quota-spent (the client throws that through to the
 * honest quota line — no fallback is taken, so none is logged). Any other
 * non-2xx arms the client's per-batch verbatim bank fallback, so every
 * such path logs it — no exceptions, no early returns that skip it.
 */
function respond(
  ctx: BatchCtx,
  status: number,
  body: { error: string } | { items: unknown },
  outcome: { ok: true } | { ok: false; reason: string; quotaSpent?: boolean },
  headers?: Record<string, string>,
): NextResponse {
  logInfo("api_request", { route: ROUTE, method: ctx.method, status, latency_ms: Date.now() - ctx.started });
  if (!outcome.ok) {
    logError("api_error", { route: ROUTE, message: outcome.reason });
    if (!outcome.quotaSpent) {
      logWarn("bank_fallback_triggered", { reason: outcome.reason, batch_index: ctx.batchIndex });
    }
  }
  logSummary(ctx, outcome.ok);
  return NextResponse.json(body, headers ? { status, headers } : { status });
}

export async function POST(req: Request): Promise<NextResponse> {
  const ctx: BatchCtx = { method: req.method, started: Date.now(), batchIndex: -1, subjects: null };
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Key unset (e.g. local dev without Groq) — client cycles the bank.
    return respond(ctx, 503, { error: "groq-unconfigured" }, { ok: false, reason: "groq_unconfigured" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return respond(ctx, 400, { error: "bad-json" }, { ok: false, reason: "validation_failed" });
  }
  // Cheap size guard before any validation work (JSON bomb / quota waste).
  try {
    if (JSON.stringify(body)?.length > MAX_BODY_BYTES) {
      return respond(ctx, 413, { error: "body-too-large" }, { ok: false, reason: "validation_failed" });
    }
  } catch {
    return respond(ctx, 400, { error: "bad-json" }, { ok: false, reason: "validation_failed" });
  }
  // Batch index is informational ONLY (feeds the fallback log line) — it
  // never affects validation, quota, or Groq. Absent/invalid → -1.
  const rawBi = (body as { batchIndex?: unknown } | null)?.batchIndex;
  if (typeof rawBi === "number" && Number.isInteger(rawBi) && rawBi >= 0) ctx.batchIndex = rawBi;
  const subjects = (body as { subjects?: unknown } | null)?.subjects;
  if (!validSubjects(subjects)) {
    // Malformed requests never touch Groq and never consume rate-limit quota.
    return respond(ctx, 400, { error: "bad-subjects" }, { ok: false, reason: "validation_failed" });
  }
  ctx.subjects = subjects;

  // Quota guards BEFORE Groq. Daily print cap first (honest 429), then
  // the hourly batch bucket. Drills are untouched by both. Every 429
  // carries Retry-After so the client can back off (default 60s).
  const ip = clientIp(req);
  if (mockDailyLimited(ip)) {
    // Quota spent: NO fallback is taken (client shows the honest quota
    // line), so no bank_fallback_triggered here — only api_request/api_error.
    return respond(
      ctx,
      429,
      { error: "mock-quota-spent" },
      { ok: false, reason: "mock-quota-spent", quotaSpent: true },
      { "retry-after": String(secondsUntilMidnight()) },
    );
  }
  if (mockRateLimited(ip)) {
    return respond(
      ctx,
      429,
      { error: "rate-limited" },
      { ok: false, reason: "rate_limited" },
      { "retry-after": "60" },
    );
  }

  const prompt = buildMockPrompt(subjects);
  const groqRetryAfter = (e: unknown): string | null => {
    if (e && typeof e === "object" && "groqStatus" in e && (e as { groqStatus?: unknown }).groqStatus === 429) {
      const raw = (e as { groqRetryAfter?: unknown }).groqRetryAfter;
      if (typeof raw === "string" && raw.trim().length > 0) return raw;
      return "60";
    }
    return null;
  };
  const groqReason = (e: unknown): string => {
    const t = classifyGroqError(e);
    return t === "http_429" ? "groq_429" : t === "timeout" ? "groq_timeout" : "groq_error";
  };
  try {
    const items = await callGroq(prompt, apiKey);
    return respond(ctx, 200, { items }, { ok: true });
  } catch (first) {
    const ra = groqRetryAfter(first);
    if (ra !== null) {
      // Groq per-minute limit: no hot retry — answer 429 so the client
      // waits out the minute window and retries once.
      return respond(
        ctx,
        429,
        { error: "groq-rate-limited" },
        { ok: false, reason: "groq_429" },
        { "retry-after": ra },
      );
    }
    try {
      // One retry, same prompt and validation.
      const items = await callGroq(prompt, apiKey);
      return respond(ctx, 200, { items }, { ok: true });
    } catch (second) {
      const ra2 = groqRetryAfter(second);
      if (ra2 !== null) {
        return respond(
          ctx,
          429,
          { error: "groq-rate-limited" },
          { ok: false, reason: "groq_429" },
          { "retry-after": ra2 },
        );
      }
      return respond(ctx, 502, { error: "groq-failed" }, { ok: false, reason: groqReason(second) });
    }
  }
}
