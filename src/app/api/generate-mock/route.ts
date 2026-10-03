import { NextResponse } from "next/server";
import {
  buildMockPrompt,
  parseStrictDrillJson,
  MOCK_BATCH_MAX,
  type MockSubjectCount,
} from "@/engine/question-generator";

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
    return parseStrictDrillJson(content);
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Key unset (e.g. local dev without Groq) — client cycles the bank.
    return NextResponse.json({ error: "groq-unconfigured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  // Cheap size guard before any validation work (JSON bomb / quota waste).
  try {
    if (JSON.stringify(body)?.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "body-too-large" }, { status: 413 });
    }
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const subjects = (body as { subjects?: unknown } | null)?.subjects;
  if (!validSubjects(subjects)) {
    // Malformed requests never touch Groq and never consume rate-limit quota.
    return NextResponse.json({ error: "bad-subjects" }, { status: 400 });
  }

  // Quota guards BEFORE Groq. Daily print cap first (honest 429), then
  // the hourly batch bucket. Drills are untouched by both. Every 429
  // carries Retry-After so the client can back off (default 60s).
  const ip = clientIp(req);
  if (mockDailyLimited(ip)) {
    return NextResponse.json(
      { error: "mock-quota-spent" },
      { status: 429, headers: { "retry-after": String(secondsUntilMidnight()) } },
    );
  }
  if (mockRateLimited(ip)) {
    return NextResponse.json(
      { error: "rate-limited" },
      { status: 429, headers: { "retry-after": "60" } },
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
  try {
    const items = await callGroq(prompt, apiKey);
    return NextResponse.json({ items });
  } catch (first) {
    const ra = groqRetryAfter(first);
    if (ra !== null) {
      // Groq per-minute limit: no hot retry — answer 429 so the client
      // waits out the minute window and retries once.
      return NextResponse.json(
        { error: "groq-rate-limited" },
        { status: 429, headers: { "retry-after": ra } },
      );
    }
    try {
      // One retry, same prompt and validation.
      const items = await callGroq(prompt, apiKey);
      return NextResponse.json({ items });
    } catch (second) {
      const ra2 = groqRetryAfter(second);
      if (ra2 !== null) {
        return NextResponse.json(
          { error: "groq-rate-limited" },
          { status: 429, headers: { "retry-after": ra2 } },
        );
      }
      return NextResponse.json({ error: "groq-failed" }, { status: 502 });
    }
  }
}
