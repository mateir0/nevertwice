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
// Production Llama 3.3 70B instruct ID, verified at
// https://console.groq.com/docs/models (Supported Models table).
const GROQ_MODEL = "llama-3.3-70b-versatile";

const VALID_ERRORS = new Set([
  "concept-gap",
  "misread",
  "time-pressure",
  "silly-mistake",
  "formula-error",
]);

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
              "You are a drill-question engine for NUST Entry Test prep. Output ONLY strict JSON — no markdown, no fences, no commentary.",
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
    return NextResponse.json({ error: "bad-targets" }, { status: 400 });
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
