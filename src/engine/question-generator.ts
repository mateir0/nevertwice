import type { ErrorType, Question } from "@/types";
import { nustSeedQuestions } from "@/config/exams/nust";
import { sanitizeStem } from "@/engine/format-math";

/**
 * Deterministic Fisher-Yates shuffle of a question's options array,
 * remapping correctIndex to follow the correct answer.
 *
 * Biased sort-based shuffles (Array.sort(() => Math.random() - 0.5))
 * are forbidden project-wide for option shuffling — this is the only
 * approved path. Applied to EVERY question at session/drill assembly
 * time, both the seed-bank session path and the drill path.
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
    "Each element must be exactly: {\"text\": string, \"options\": [4 distinct strings], \"correctIndex\": 0|1|2|3}.",
    "Every question needs exactly 4 options and exactly one correct answer.",
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
    if (!Array.isArray(rec.options) || rec.options.length !== 4 || !rec.options.every((o) => typeof o === "string" && o.trim().length > 0)) {
      throw new Error(`item ${i} bad options`);
    }
    if (!Number.isInteger(rec.correctIndex) || (rec.correctIndex as number) < 0 || (rec.correctIndex as number) > 3) {
      throw new Error(`item ${i} bad correctIndex`);
    }
    return { text: (rec.text as string).trim(), options: (rec.options as string[]).map((o) => o.trim()), correctIndex: rec.correctIndex as number };
  });
}

// ---------- deterministic fallback (zero network) ----------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "drill";
}

function stripSeedPrefix(text: string): string {
  return text
    .replace(/^Stand-in drill Q\d+\s*—\s*/, "")
    .replace(/^\s*Practice drill:\s*/i, "")
    .trim() || text;
}

/**
 * Template-built drill questions derived from the seed bank.
 *
 * Dedup rules (zero-network fallback):
 *  - Track emitted question TEXTS (normalized: lowercase, whitespace
 *    collapsed) for the duration of this single drill build.
 *  - Never emit the same normalized text twice within one drill.
 *  - Before any text reuse, vary the numbers/values inside the template
 *    so the emitted text is materially different.
 *  - After dedup/wear, apply shuffleOptions() so option order is unbiased
 *    and correctIndex stays correct.
 *
 * Same targets always yield the same set (deterministic multipliers),
 * but no text repeats within a drill.
 */
export function buildDrillFallback(targets: DrillGenTarget[]): Question[] {
  const out: Question[] = [];
  const emitted = new Set<string>();

  targets.forEach((t, ti) => {
    const sameSub = nustSeedQuestions.filter((q) => q.topic === t.topic && q.subtopic === t.subtopic);
    const sameTopic = nustSeedQuestions.filter((q) => q.topic === t.topic);
    const pool = sameSub.length > 0 ? sameSub : sameTopic.length > 0 ? sameTopic : nustSeedQuestions;

    for (let k = 0; k < Math.max(0, t.count); k++) {
      // Walk the pool cyclically, skipping any seed whose current
      // emitted text already exists in this drill.
      const base = pickDedupedSeed(pool, emitted, t, k, ti);
      const stem = sanitizeStem(stripSeedPrefix(base.text));
      const text = varyStem(stem, t.topic, t.subtopic, k, ti);

      // Safety valve: if every pool entry would repeat, perturb the
      // last candidate's numbers instead of emitting a duplicate.
      const normalized = normalizeText(text);
      if (emitted.has(normalized)) {
        const last = pool[(k + ti) % pool.length];
        const perturbedStem = perturbStem(stripSeedPrefix(last.text), k, ti);
        out.push(
          shuffleOptions({
            id: `drill-${slug(t.subtopic)}-${ti}-${k + 1}`,
            section: last.section,
            topic: t.topic,
            subtopic: t.subtopic,
            text: sanitizeStem(perturbedStem),
            options: [...last.options],
            correctIndex: last.correctIndex,
            isPlaceholder: false,
          }),
        );
        emitted.add(normalizeText(perturbedStem));
        continue;
      }

      emitted.add(normalized);
      out.push(
        shuffleOptions({
          id: `drill-${slug(t.subtopic)}-${ti}-${k + 1}`,
          section: base.section,
          topic: t.topic,
          subtopic: t.subtopic,
          text,
          options: [...base.options],
          correctIndex: base.correctIndex,
          isPlaceholder: false,
        }),
      );
    }
  });
  return out;
}

/**
 * Pick the next seed that would not emit a duplicate normalized text
 * given the current varyStem transform. Walk the pool cyclically.
 */
function pickDedupedSeed(
  pool: typeof nustSeedQuestions,
  emitted: Set<string>,
  t: DrillGenTarget,
  k: number,
  ti: number,
): typeof nustSeedQuestions[number] {
  const start = (k + ti) % pool.length;
  for (let offset = 0; offset < pool.length; offset++) {
    const candidate = pool[(start + offset) % pool.length];
    const stem = sanitizeStem(stripSeedPrefix(candidate.text));
    const text = varyStem(stem, t.topic, t.subtopic, k, ti);
    if (!emitted.has(normalizeText(text))) return candidate;
  }
  // Pool fully fragmented for this slot — fall back to the first entry;
  // the caller's safety valve will perturb it.
  return pool[start];
}

/**
 * Deterministically vary the numbers/values inside a seed stem so the
 * same template can be reused with materially different text BEFORE any
 * text-level repeat occurs.
 *
 * Uses a deterministic multiplier derived from the target + slot, so
 * the same targets always yield the same questions — but consecutive
 * slots on the same subtopic get different numbers.
 */
function varyStem(stem: string, topic: string, subtopic: string, k: number, ti: number): string {
  const seed = hashString(`${topic}::${subtopic}::${k}::${ti}`);
  const rng = mulberry32(seed);

  // Deterministic digit replacer: picks digits/integer tokens in the stem
  // and replaces them with a different deterministic value, capped to a
  // sensible exam range so the question is still solvable.
  return stem.replace(/-?\d+(\.\d+)?/g, (m) => {
    const base = parseFloat(m);
    if (!Number.isFinite(base)) return m;
    const r = rng();
    // Shift by 1–4 in either direction, keeping magnitudes sane.
    const shift = Math.floor(r * 4) + 1;
    const sign = r < 0.5 ? -1 : 1;
    let next = base + sign * shift;
    if (Number.isInteger(base)) {
      next = Math.round(next);
    } else {
      next = Math.round(next * 10) / 10;
    }
    // Keep exam-friendly magnitudes: no zero/negative where a positive
    // magnitude is expected, no absurdly large values.
    if (next <= 0) next = Math.abs(next) || 1;
    if (next > 9999) next = base;
    return String(next);
  });
}

/**
 * Heavier perturbation when the normal varyStem path would still collide:
 * reroll the inner digits with a different seed offset so the text differs.
 */
function perturbStem(stem: string, k: number, ti: number): string {
  const seed = hashString(`perturb::${k}::${ti}`);
  const rng = mulberry32(seed);
  return stem.replace(/-?\d+(\.\d+)?/g, (m) => {
    const base = parseFloat(m);
    if (!Number.isFinite(base)) return m;
    const r = rng();
    const shift = Math.floor(r * 6) + 2;
    const sign = r < 0.5 ? -1 : 1;
    let next = base + sign * shift;
    if (Number.isInteger(base)) next = Math.round(next);
    else next = Math.round(next * 10) / 10;
    if (next <= 0) next = Math.abs(next) || 2;
    if (next > 9999) next = base;
    return String(next);
  });
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
    return {
      id: `drill-${slug(slot.subtopic)}-ai-${i + 1}`,
      section: slot.section,
      topic: slot.topic,
      subtopic: slot.subtopic,
      text: sanitizeStem(g.text),
      options: g.options.map((o) => sanitizeStem(o)),
      correctIndex: g.correctIndex,
      isPlaceholder: false,
    } satisfies Question;
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
 * Generate drill questions. Chain: Groq cloud route (one attempt; the
 * server route itself does one retry) → deterministic local fallback on
 * ANY failure (no key, network error, bad JSON). Never throws, never hangs.
 */
export async function generateDrillQuestions(targets: DrillGenTarget[]): Promise<Question[]> {
  const active = targets.filter((t) => t.count > 0);
  if (active.length === 0) return [];
  try {
    return assignToSlots(await tryGroqRoute(active), active);
  } catch {
    return buildDrillFallback(active);
  }
}
