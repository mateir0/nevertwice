import { NextResponse } from "next/server";
import {
  buildDrillPrompt,
  parseStrictDrillJson,
  type DrillGenTarget,
} from "@/engine/question-generator";

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

// ---------- per-IP rate limiting (Groq quota guard) ----------

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
    if (typeof r.topic !== "string" || r.topic.length === 0) return false;
    if (typeof r.subtopic !== "string" || r.subtopic.length === 0) return false;
    if (typeof r.errorType !== "string" || !VALID_ERRORS.has(r.errorType)) return false;
    if (!Number.isInteger(r.count) || (r.count as number) < 1 || (r.count as number) > 8) return false;
    total += r.count as number;
  }
  return total >= 1 && total <= 12;
}

async function callGroq(prompt: string, apiKey: string, timeoutMs = 30000) {
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
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`groq http ${res.status}`);
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
    // Key unset (e.g. local dev without Groq) — client skips to seed bank.
    return NextResponse.json({ error: "groq-unconfigured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const targets = (body as { targets?: unknown } | null)?.targets;
  if (!validTargets(targets)) {
    // Malformed requests never touch Groq and never consume rate-limit quota.
    return NextResponse.json({ error: "bad-targets" }, { status: 400 });
  }

  // Quota guard BEFORE Groq: 10 generations per IP per hour. The client
  // treats 429 like any other failure and falls back to the seed bank.
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const prompt = buildDrillPrompt(targets);
  try {
    const items = await callGroq(prompt, apiKey);
    return NextResponse.json({ items });
  } catch {
    try {
      // One retry, same prompt and validation.
      const items = await callGroq(prompt, apiKey);
      return NextResponse.json({ items });
    } catch {
      return NextResponse.json({ error: "groq-failed" }, { status: 502 });
    }
  }
}
