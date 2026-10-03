import type { ErrorType, Question } from "@/types";
import { getRecentQuestionIds, nustSeedQuestions } from "@/config/exams/nust";
import { sanitizeStem } from "@/engine/format-math";

/**
 * Deterministic Fisher-Yates shuffle of a question's options array,
 * remapping correctIndex to follow the correct answer.
 *
 * Biased sort-based shuffles (Array.sort(() => Math.random() - 0.5))
 * are forbidden project-wide for option shuffling — this is the only
 * approved path. Applied to EVERY question at session/drill assembly
 * time, on BOTH paths (Groq items via assignToSlots, seeds via the
 * deterministic fallback).
 */
export function shuffleOptions(question: Question): Question {
  const options = [...question.options];
  let j: number;
  let temp: string;
  for (let i = options.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    temp = options[i];
    options[i] = options[j];
    options[j] = temp;
  }
  const correctIndex = options.indexOf(question.options[question.correctIndex]);
  return { ...question, options, correctIndex };
}

/**
 * Normalize a question text for dedup comparison: lowercase + collapse
 * all whitespace runs to a single space, trim.
 */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Drill question generator.
 *
 * Chain: Groq cloud (via the server-side /api/generate-drill route) →
 * deterministic seed-bank fallback. Never throws; the feature works
 * with zero network. Ollama is removed (OOM on this machine) — Groq is
 * the ONLY model provider.
 */
export interface DrillGenTarget {
  topic: string;
  subtopic: string;
  errorType: ErrorType;
  count: number;
}

export interface RawGenerated {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const ERROR_RULES: Record<ErrorType, string> = {
  misread:
    "MISREAD targets: write tricky wording with close distractors that differ by a single word, unit, or sign. Punish skimming.",
  "formula-error":
    "FORMULA-ERROR targets: the question must hinge on picking the RIGHT formula first; distractors are results of the most common wrong formulas.",
  "time-pressure":
    "TIME-PRESSURE targets: each question must be solvable in under 30 seconds via a shortcut or cancellation. Reward the fast path.",
  "concept-gap":
    "CONCEPT-GAP targets: foundational checks. Test the core definition or first principle before any computation.",
  "silly-mistake":
    "SILLY-MISTAKE targets: precision traps. Distractors exploit sign flips, unit swaps, and off-by-one answers.",
};

/** Shared strict-JSON prompt — single source of truth for the Groq route. */
export function buildDrillPrompt(targets: DrillGenTarget[]): string {
  const brief = targets
    .map(
      (t) =>
        `- ${t.subtopic} (${t.topic}): ${t.count} question(s). ${ERROR_RULES[t.errorType]}`,
    )
    .join("\n");
  const total = targets.reduce((n, t) => n + Math.max(0, t.count), 0);
  return [
    `Write exactly ${total} multiple-choice drill questions for a NUST Entry Test student.`,
    "Targets:",
    brief,
    "",
    "STRICT OUTPUT CONTRACT. Respond with ONLY a raw JSON array, no markdown, no code fences, no commentary.",
    "Each element must be exactly: {\"text\": string, \"options\": [4 distinct strings], \"correctIndex\": 0|1|2|3, \"explanation\": string}.",
    "Every question needs exactly 4 options and exactly one correct answer.",
    "explanation: 1-3 sentences. Name the correct option, give the key step or formula, and say why the most tempting distractor is wrong. Unicode math notation (x², √, π), never LaTeX.",
    "The app reshuffles options at runtime, so refer to the correct option by its content — never by the letter A/B/C/D.",
    "Distribute the correct answer uniformly across positions 0–3 — do not cluster it on one letter.",
    "Write each question as a real exam stem. Never prefix with 'Drill', 'Practice', or topic names.",
    "Use Unicode math notation directly — superscripts (x², x³), √, π, θ, ×, ÷, ±, →, ∞. Never caret notation, LaTeX, backslashes, or \\( \\) delimiters.",
  ].join("\n");
}

/** Shared strict validator — single source of truth for the Groq route. */
export function parseStrictDrillJson(raw: string): RawGenerated[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) throw new Error("no JSON array in response");
  const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty array");
  return parsed.map((item, i) => {
    if (typeof item !== "object" || item === null) throw new Error(`item ${i} not an object`);
    const rec = item as Record<string, unknown>;
    if (typeof rec.text !== "string" || rec.text.trim().length === 0) throw new Error(`item ${i} bad text`);
    if (!Array.isArray(rec.options) || rec.options.length !== 4 || !rec.options.every((o) => typeof o === "string" && (o as string).trim().length > 0)) {
      throw new Error(`item ${i} bad options`);
    }
    if (!Number.isInteger(rec.correctIndex) || (rec.correctIndex as number) < 0 || (rec.correctIndex as number) > 3) {
      throw new Error(`item ${i} bad correctIndex`);
    }
    const options = (rec.options as string[]).map((o) => o.trim());
    // Distinctness is load-bearing: duplicate option strings make
    // shuffleOptions' indexOf remap ambiguous and can silently move the
    // key onto a distractor. Reject the whole item instead.
    const seen = new Set(options.map((o) => o.toLowerCase().replace(/\s+/g, " ").trim()));
    if (seen.size !== 4) throw new Error(`item ${i} duplicate options`);
    if (typeof rec.explanation !== "string" || rec.explanation.trim().length === 0) {
      throw new Error(`item ${i} bad explanation`);
    }
    return {
      text: (rec.text as string).trim(),
      options,
      correctIndex: rec.correctIndex as number,
      explanation: (rec.explanation as string).trim(),
    };
  });
}

// ---------- deterministic fallback (zero network) ----------

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "drill";
}

/**
 * Template-free deterministic drill fallback.
 *
 * Emits seed-bank questions VERBATIM (sanitized + deduped by normalized
 * text only). Numbers inside stems are NEVER rewritten: varying a stem
 * while keeping the original options/correctIndex produces mathematically
 * false answer keys, which destroys trust. A verbatim repeat when the
 * pool is exhausted is acceptable degradation — an repeated question
 * annoys; a wrong key mis-trains.
 *
 * Dedup rules (zero-network fallback):
 *  - Track emitted question TEXTS (normalized) for this single drill build.
 *  - Never emit the same normalized text twice within one drill UNTIL the
 *    eligible pool is exhausted; then cycle verbatim repeats.
 *  - Prefer seeds unseen in the last 3 sessions when the pool allows it.
 *  - Apply shuffleOptions() to every emitted question so option order is
 *    unbiased and correctIndex stays correct.
 */
export function buildDrillFallback(targets: DrillGenTarget[]): Question[] {
  const out: Question[] = [];
  const emitted = new Set<string>();
  let recent: Set<string>;
  try {
    recent = new Set(getRecentQuestionIds());
  } catch {
    recent = new Set();
  }

  targets.forEach((t, ti) => {
    const sameSub = nustSeedQuestions.filter((q) => q.topic === t.topic && q.subtopic === t.subtopic);
    const sameTopic = nustSeedQuestions.filter((q) => q.topic === t.topic);
    const pool = sameSub.length > 0 ? sameSub : sameTopic.length > 0 ? sameTopic : nustSeedQuestions;
    // Freshness preference: skip bank questions dealt in the last 3
    // sessions unless that would empty the pool.
    const unrecent = pool.filter((q) => !recent.has(q.id));
    const eligible = unrecent.length > 0 ? unrecent : pool;

    for (let k = 0; k < Math.max(0, t.count); k++) {
      let pick = eligible[(k + ti) % eligible.length];
      // Walk forward while this exact text already shipped in this drill.
      for (let offset = 0; offset < eligible.length; offset++) {
        const candidate = eligible[((k + ti) % eligible.length + offset) % eligible.length];
        if (!emitted.has(normalizeText(sanitizeStem(candidate.text)))) {
          pick = candidate;
          break;
        }
        // Pool exhausted for this slot: fall through to a verbatim cycle
        // repeat of the in-walk candidate rather than inventing numbers.
        pick = candidate;
      }
      const text = sanitizeStem(pick.text);
      emitted.add(normalizeText(text));
      out.push(
        shuffleOptions({
          id: `drill-${slug(t.subtopic)}-${ti}-${k + 1}`,
          section: pick.section,
          topic: t.topic,
          subtopic: t.subtopic,
          text,
          options: [...pick.options],
          correctIndex: pick.correctIndex,
          explanation: sanitizeStem(pick.explanation),
          isPlaceholder: false,
        }),
      );
    }
  });
  return out;
}

/** Expand plan targets into per-question slots, then attach generated items to slots. */
export function assignToSlots(generated: RawGenerated[], targets: DrillGenTarget[]): Question[] {
  const seedsBySlot: { section: string; topic: string; subtopic: string }[] = [];
  targets.forEach((t) => {
    const match =
      nustSeedQuestions.find((q) => q.topic === t.topic && q.subtopic === t.subtopic) ??
      nustSeedQuestions.find((q) => q.topic === t.topic) ??
      nustSeedQuestions[0];
    for (let k = 0; k < Math.max(0, t.count); k++) {
      seedsBySlot.push({ section: match.section, topic: t.topic, subtopic: t.subtopic });
    }
  });
  return generated.map((g, i) => {
    const slot = seedsBySlot[i % Math.max(seedsBySlot.length, 1)] ?? {
      section: "General",
      topic: targets[0]?.topic ?? "General",
      subtopic: targets[0]?.subtopic ?? "General",
    };
    // Groq items get the same unbiased Fisher-Yates shuffle as fallback
    // seeds — LLM position bias must never reach the user.
    return shuffleOptions({
      id: `drill-${slug(slot.subtopic)}-ai-${i + 1}`,
      section: slot.section,
      topic: slot.topic,
      subtopic: slot.subtopic,
      text: sanitizeStem(g.text),
      options: g.options.map((o) => sanitizeStem(o)),
      correctIndex: g.correctIndex,
      explanation: sanitizeStem(g.explanation),
      isPlaceholder: false,
    } satisfies Question);
  });
}

/**
 * Middle link of the chain: Groq cloud via the server-side
 * /api/generate-drill route. The API key lives only on the server —
 * this client only ever sees validated question items or an HTTP error.
 * Any failure (route down, key unset, bad JSON) throws → caller falls back.
 */
async function tryGroqRoute(targets: DrillGenTarget[], timeoutMs = 30000): Promise<RawGenerated[]> {
  if (typeof window === "undefined") throw new Error("groq route is client-side only");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/generate-drill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targets }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`drill route http ${res.status}`);
    const data = (await res.json()) as { items?: unknown };
    return parseStrictDrillJson(JSON.stringify(data.items));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * THE drill-question pipeline — the single async end-to-end path used by
 * /app and /results. Groq cloud route (one attempt; the server route
 * itself does one retry) → deterministic local fallback on ANY failure
 * (no key, network error, bad JSON, timeout). Never throws: when Groq
 * fails or is unconfigured the fallback delivers instantly.
 *
 * Every question on BOTH branches leaves here via shuffleOptions, so
 * correctIndex is remapped and A/B/C/D placement is unbiased.
 */
export async function buildDrillQuestions(targets: DrillGenTarget[]): Promise<Question[]> {
  const active = targets.filter((t) => t.count > 0);
  if (active.length === 0) return [];
  try {
    return assignToSlots(await tryGroqRoute(active), active);
  } catch {
    return buildDrillFallback(active);
  }
}

/** Back-compat alias — same pipeline, same guarantees. */
export async function generateDrillQuestions(targets: DrillGenTarget[]): Promise<Question[]> {
  return buildDrillQuestions(targets);
}
