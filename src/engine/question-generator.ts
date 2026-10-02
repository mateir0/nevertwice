import type { ErrorType, Question } from "@/types";
import { nustSeedQuestions } from "@/config/exams/nust";

/**
 * Drill question generator.
 *
 * Primary path: local Ollama (gemma3:4b) prompted for STRICT JSON.
 * Fallback path: deterministic template-built questions derived from the
 * seed bank in src/config/exams/nust.ts — the feature works with zero network.
 */

export interface DrillGenTarget {
  topic: string;
  subtopic: string;
  errorType: ErrorType;
  count: number;
}

interface RawGenerated {
  text: string;
  options: string[];
  correctIndex: number;
}

const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "gemma3:4b";

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

function buildPrompt(targets: DrillGenTarget[]): string {
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
  ].join("\n");
}

function parseStrict(raw: string): RawGenerated[] {
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

async function tryOllama(targets: DrillGenTarget[], timeoutMs = 25000): Promise<RawGenerated[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: buildPrompt(targets), stream: false, format: "json" }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ollama http ${res.status}`);
    const data = (await res.json()) as { response?: unknown };
    if (typeof data.response !== "string") throw new Error("ollama bad shape");
    return parseStrict(data.response);
  } finally {
    clearTimeout(timer);
  }
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
  return text.replace(/^Stand-in drill Q\d+\s*—\s*/, "").trim() || text;
}

/**
 * Template-built drill questions derived from the seed bank.
 * Deterministic: same targets always yield the same set.
 * Generated questions get isPlaceholder: false and "drill-" ids.
 */
export function buildDrillFallback(targets: DrillGenTarget[]): Question[] {
  const out: Question[] = [];
  targets.forEach((t, ti) => {
    const sameSub = nustSeedQuestions.filter((q) => q.topic === t.topic && q.subtopic === t.subtopic);
    const sameTopic = nustSeedQuestions.filter((q) => q.topic === t.topic);
    const pool = sameSub.length > 0 ? sameSub : sameTopic.length > 0 ? sameTopic : nustSeedQuestions;
    for (let k = 0; k < Math.max(0, t.count); k++) {
      const base = pool[(k + ti) % pool.length];
      const stem = stripSeedPrefix(base.text);
      const rng = mulberry32(hashString(`${t.topic}::${t.subtopic}::${k}`));
      const order = [0, 1, 2, 3].sort(() => rng() - 0.5);
      const options = order.map((oi) => base.options[oi]);
      out.push({
        id: `drill-${slug(t.subtopic)}-${ti}-${k + 1}`,
        section: base.section,
        topic: t.topic,
        subtopic: t.subtopic,
        text: `Drill · ${t.subtopic} — ${stem}`,
        options,
        correctIndex: order.indexOf(base.correctIndex),
        isPlaceholder: false,
      });
    }
  });
  return out;
}

/** Expand plan targets into per-question slots, then attach generated items to slots. */
function assignToSlots(generated: RawGenerated[], targets: DrillGenTarget[]): Question[] {
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
      text: g.text,
      options: g.options,
      correctIndex: g.correctIndex,
      isPlaceholder: false,
    } satisfies Question;
  });
}

/**
 * Generate drill questions: Ollama first (one retry), deterministic
 * local fallback if Ollama is unreachable or returns invalid JSON.
 */
export async function generateDrillQuestions(targets: DrillGenTarget[]): Promise<Question[]> {
  const active = targets.filter((t) => t.count > 0);
  if (active.length === 0) return [];
  try {
    const first = await tryOllama(active);
    return assignToSlots(first, active);
  } catch {
    try {
      const second = await tryOllama(active);
      return assignToSlots(second, active);
    } catch {
      return buildDrillFallback(active);
    }
  }
}
