import type { ErrorType, Question } from "@/types";
import { getRecentQuestionIds, nustSeedQuestions, recordSeenQuestionIds } from "@/config/exams/nust";
import { getExposure, recordExposureIds } from "@/engine/exposure";
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
    "NET-level difficulty: single-concept questions solvable in ~54 seconds; no multi-step monsters, no trick options a real paper would never print.",
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
 *  - Within the eligible pool, weight by all-time exposure ascending —
 *    never-seen first, then least-seen (stable over bank order).
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
  let exposure: Record<string, number>;
  try {
    exposure = getExposure();
  } catch {
    exposure = {};
  }
  const dealtBankIds: string[] = [];

  targets.forEach((t, ti) => {
    const sameSub = nustSeedQuestions.filter((q) => q.topic === t.topic && q.subtopic === t.subtopic);
    const sameTopic = nustSeedQuestions.filter((q) => q.topic === t.topic);
    const pool = sameSub.length > 0 ? sameSub : sameTopic.length > 0 ? sameTopic : nustSeedQuestions;
    // Freshness preference: skip bank questions dealt in the last 3
    // sessions unless that would empty the pool. Within the eligible
    // pool, never-seen (all-time) comes first, then least-seen — stable
    // over bank order so ties stay deterministic.
    const unrecent = pool.filter((q) => !recent.has(q.id));
    const base = unrecent.length > 0 ? unrecent : pool;
    const eligible = [...base].sort(
      (a, b) => (exposure[a.id] ?? 0) - (exposure[b.id] ?? 0),
    );

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
      dealtBankIds.push(pick.id);
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
  // All-time exposure: exactly one increment per deal — the underlying
  // bank stems actually shown plus the emitted drill ids. The pipeline
  // below never re-records the fallback branch, so StrictMode sharing one
  // in-flight promise cannot double-fire.
  recordExposureIds([...dealtBankIds, ...out.map((q) => q.id)]);
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
 *
 * StrictMode guard: concurrent calls with identical targets share one
 * in-flight promise, so the double-mounted effect in dev deals (and
 * records exposure) exactly once. The fallback branch records its own
 * exposure; this wrapper records only the Groq branch — never both.
 */
let inflightDrill: { key: string; promise: Promise<Question[]> } | null = null;

export function buildDrillQuestions(targets: DrillGenTarget[]): Promise<Question[]> {
  const active = targets.filter((t) => t.count > 0);
  if (active.length === 0) return Promise.resolve([]);
  const key = JSON.stringify(active);
  if (inflightDrill && inflightDrill.key === key) return inflightDrill.promise;
  const run = async (): Promise<Question[]> => {
    try {
      const out = assignToSlots(await tryGroqRoute(active), active);
      recordExposureIds(out.map((q) => q.id));
      return out;
    } catch {
      return buildDrillFallback(active);
    } finally {
      if (inflightDrill?.promise === promise) inflightDrill = null;
    }
  };
  const promise = run();
  inflightDrill = { key, promise };
  return promise;
}

/** Back-compat alias — same pipeline, same guarantees. */
export async function generateDrillQuestions(targets: DrillGenTarget[]): Promise<Question[]> {
  return buildDrillQuestions(targets);
}

// ---------- full mock (200Q NET-format simulation) ----------

/**
 * FULL MOCK — a full-length NET-format simulation, never labeled "past
 * papers" (NUST does not release them). Bank-first, then Groq: per subject
 * the verified bank deals first (never-seen preferred, shuffle, verbatim
 * stems — same guarantees as the drill fallback), Groq generates the
 * remainder. Any Groq batch failure falls back to verbatim bank cycling
 * for its subject: repeats acceptable, wrong keys never acceptable.
 */

export const MOCK_TOTAL_QUESTIONS = 200;
export const MOCK_TOTAL_SECONDS = 180 * 60;
export const MOCK_BATCH_MAX = 12;
/** Stagger between sequential mock batches — keeps Groq under per-minute limits. */
export const MOCK_BATCH_STAGGER_MS = 8000;
/** Server 429 error body when the daily mock print quota is spent. */
export const MOCK_QUOTA_SPENT_ERROR = "mock-quota-spent";
/** Honest dossier line shown when the daily print quota is spent. */
export const MOCK_QUOTA_SPENT_LINE =
  "DAILY PRINT QUOTA SPENT — DRILLS UNAFFECTED. BACK TOMORROW.";

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  // Non-DOM envs (SSR, node:test) never burn real minutes waiting on
  // stagger/backoff — production browsers always wait the full delay.
  if (typeof document === "undefined") return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Stagger delay for mock batches: 0 off-DOM (tests/SSR), ~8s in browsers. */
export function getMockStaggerMs(): number {
  const override = Number(process.env.MOCK_BATCH_STAGGER_MS);
  if (Number.isFinite(override) && override >= 0) return override;
  if (typeof document === "undefined") return 0;
  return MOCK_BATCH_STAGGER_MS;
}

/** Retry-After (seconds) → ms. Defaults to 60s per the mock budget fix. */
function retryAfterMs(header: string | null): number {
  const secs = header ? Number(header) : NaN;
  if (Number.isFinite(secs) && secs >= 0) return secs * 1000;
  if (typeof document === "undefined") return 0;
  return 60 * 1000;
}

export interface MockSubjectCount {
  subject: string;
  count: number;
}

/** NET-Engineering weighting. Section names match the bank exactly. */
export const MOCK_SUBJECTS: { subject: string; count: number }[] = [
  { subject: "Mathematics", count: 80 },
  { subject: "Physics", count: 60 },
  { subject: "Chemistry", count: 30 },
  { subject: "English", count: 20 },
  { subject: "Intelligence", count: 10 },
];

export interface MockFill {
  subject: string;
  need: number;
  bankTake: number;
  groqNeed: number;
}

/** Bank-first fill plan: min(need, bank) verbatim per subject, Groq the rest. */
export function planMockFill(): MockFill[] {
  return MOCK_SUBJECTS.map(({ subject, count: need }) => {
    const bankCount = nustSeedQuestions.filter((q) => q.section === subject).length;
    const bankTake = Math.min(need, bankCount);
    return { subject, need, bankTake, groqNeed: need - bankTake };
  });
}

/**
 * Flatten every subject's Groq remainder into ≤12-question batches,
 * preserving subject order (a batch may span two subjects). 82 remainder
 * questions → 7 batches, fired SEQUENTIALLY with ~8s stagger (Groq free
 * tier rate-limits per minute — parallel spikes 429 most batches).
 */
export function planMockBatches(fills: MockFill[]): MockSubjectCount[][] {
  const slots: string[] = [];
  for (const f of fills) {
    for (let i = 0; i < Math.max(0, f.groqNeed); i++) slots.push(f.subject);
  }
  const batches: MockSubjectCount[][] = [];
  for (let i = 0; i < slots.length; i += MOCK_BATCH_MAX) {
    const chunk = slots.slice(i, i + MOCK_BATCH_MAX);
    const counts: MockSubjectCount[] = [];
    for (const subject of chunk) {
      const last = counts[counts.length - 1];
      if (last && last.subject === subject) last.count += 1;
      else counts.push({ subject, count: 1 });
    }
    batches.push(counts);
  }
  return batches;
}

/**
 * Mock prompt — same strict JSON contract, Unicode-math rules, and
 * NET-difficulty calibration as drills, but NO error-type targeting:
 * this is an exam, not a drill.
 */
export function buildMockPrompt(subjectCounts: MockSubjectCount[]): string {
  const brief = subjectCounts.map((s) => `- ${s.subject}: ${s.count} question(s).`).join("\n");
  const total = subjectCounts.reduce((n, s) => n + Math.max(0, s.count), 0);
  return [
    `Write exactly ${total} multiple-choice questions for a full-length NUST Entry Test (NET) mock paper.`,
    "Subjects:",
    brief,
    "",
    "Balanced NET paper: mix of recall, application, and shortcut-rewarding questions across the subject's subtopics.",
    "Return the questions grouped in the same subject order as listed above.",
    "",
    "STRICT OUTPUT CONTRACT. Respond with ONLY a raw JSON array, no markdown, no code fences, no commentary.",
    "Each element must be exactly: {\"text\": string, \"options\": [4 distinct strings], \"correctIndex\": 0|1|2|3, \"explanation\": string}.",
    "Every question needs exactly 4 options and exactly one correct answer.",
    "explanation: 1-3 sentences. Name the correct option, give the key step or formula, and say why the most tempting distractor is wrong. Unicode math notation (x², √, π), never LaTeX.",
    "The app reshuffles options at runtime, so refer to the correct option by its content — never by the letter A/B/C/D.",
    "Distribute the correct answer uniformly across positions 0–3 — do not cluster it on one letter.",
    "Write each question as a real exam stem. Never prefix with 'Mock', 'Practice', or subject names.",
    "Use Unicode math notation directly — superscripts (x², x³), √, π, θ, ×, ÷, ±, →, ∞. Never caret notation, LaTeX, backslashes, or \\( \\) delimiters.",
    "NET-level difficulty: single-concept questions solvable in ~54 seconds; no multi-step monsters, no trick options a real paper would never print.",
  ].join("\n");
}

function mockSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "") || "mock";
}

/** Distinct topic/subtopic pairs the bank holds for one subject, bank order. */
function bankSubtopicSlots(subject: string): { topic: string; subtopic: string }[] {
  const seen = new Map<string, { topic: string; subtopic: string }>();
  for (const q of nustSeedQuestions) {
    if (q.section !== subject) continue;
    const key = `${q.topic}::${q.subtopic}`;
    if (!seen.has(key)) seen.set(key, { topic: q.topic, subtopic: q.subtopic });
  }
  return [...seen.values()];
}

/**
 * Deal `count` verbatim bank questions for one subject: full pool,
 * shuffled, exposure ascending (never-seen first — stable, so ties stay
 * random). Unique while the pool allows; cycles verbatim when exhausted
 * (Groq-failure path). Never throws; empty pool yields nothing.
 * Recording is the pipeline's job (once per deal) — this helper is pure.
 */
function dealBankVerbatim(
  subject: string,
  count: number,
  idPrefix: string,
): { questions: Question[]; bankIds: string[] } {
  const pool = nustSeedQuestions.filter((q) => q.section === subject);
  if (pool.length === 0 || count <= 0) return { questions: [], bankIds: [] };
  let exposure: Record<string, number>;
  try {
    exposure = getExposure();
  } catch {
    exposure = {};
  }
  const ordered = [...pool]
    .map((q, i) => ({ q, i, r: Math.random() }))
    .sort((a, b) => (exposure[a.q.id] ?? 0) - (exposure[b.q.id] ?? 0) || a.r - b.r)
    .map(({ q }) => q);
  const questions: Question[] = [];
  const bankIds: string[] = [];
  for (let k = 0; k < count; k++) {
    const pick = ordered[k % ordered.length];
    bankIds.push(pick.id);
    questions.push(
      shuffleOptions({
        id: `${idPrefix}-${k + 1}`,
        section: pick.section,
        topic: pick.topic,
        subtopic: pick.subtopic,
        text: sanitizeStem(pick.text),
        options: [...pick.options],
        correctIndex: pick.correctIndex,
        explanation: sanitizeStem(pick.explanation),
        isPlaceholder: false,
      }),
    );
  }
  return { questions, bankIds };
}

/**
 * One Groq mock batch via the server-side /api/generate-mock route.
 * Throws on ANY failure (route down, key unset, short/invalid items) —
 * the caller falls back to verbatim bank cycling for the batch.
 *
 * 429 BACKOFF: on HTTP 429 (Groq per-minute limit), read the Retry-After
 * header (default 60s), wait it out, retry once. A second failure falls
 * back to verbatim bank cycling. The daily print quota
 * ("mock-quota-spent") is NOT retried — it throws through so the UI can
 * show the honest dossier line.
 */
async function tryGroqMockRoute(
  batch: MockSubjectCount[],
  batchIndex: number,
  timeoutMs = 60000,
): Promise<Question[]> {
  if (typeof window === "undefined") throw new Error("groq mock route is client-side only");
  const total = batch.reduce((n, s) => n + s.count, 0);
  const postOnce = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch("/api/generate-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects: batch }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };
  const parseBatch = async (res: Response): Promise<Question[]> => {
    if (!res.ok) {
      if (res.status === 429) {
        let quotaSpent = false;
        try {
          const err = (await res.clone().json()) as { error?: unknown };
          quotaSpent = err?.error === MOCK_QUOTA_SPENT_ERROR;
        } catch {
          quotaSpent = false;
        }
        if (quotaSpent) throw new Error(MOCK_QUOTA_SPENT_ERROR);
      }
      const retryAfter = res.status === 429 ? res.headers.get("retry-after") : null;
      throw Object.assign(new Error(`mock route http ${res.status}`), {
        mockIs429: res.status === 429,
        mockRetryAfterMs: res.status === 429 ? retryAfterMs(retryAfter) : 0,
      });
    }
    const data = (await res.json()) as { items?: unknown };
    const items = parseStrictDrillJson(JSON.stringify(data.items));
    if (items.length !== total) throw new Error(`mock batch short: ${items.length}/${total}`);
    // Items arrive grouped in subject order (per the prompt contract).
    const out: Question[] = [];
    let cursor = 0;
    for (const block of batch) {
      const slots = bankSubtopicSlots(block.subject);
      for (let j = 0; j < block.count; j++) {
        const g = items[cursor++];
        const slot = slots.length > 0 ? slots[j % slots.length] : { topic: block.subject, subtopic: "General" };
        out.push(
          shuffleOptions({
            id: `mock-${mockSlug(block.subject)}-g${batchIndex + 1}-${j + 1}`,
            section: block.subject,
            topic: slot.topic,
            subtopic: slot.subtopic,
            text: sanitizeStem(g.text),
            options: g.options.map((o) => sanitizeStem(o)),
            correctIndex: g.correctIndex,
            explanation: sanitizeStem(g.explanation),
            isPlaceholder: false,
          } satisfies Question),
        );
      }
    }
    return out;
  };

  try {
    return await parseBatch(await postOnce());
  } catch (first) {
    if (first instanceof Error && first.message === MOCK_QUOTA_SPENT_ERROR) throw first;
    // Only 429s are worth the wait — other failures fall straight through
    // to verbatim bank cycling for the batch.
    const is429 = !!(
      first &&
      typeof first === "object" &&
      (first as { mockIs429?: unknown }).mockIs429
    );
    if (!is429) throw first;
    const waitMs =
      first && typeof first === "object" && "mockRetryAfterMs" in first
        ? Number((first as { mockRetryAfterMs?: unknown }).mockRetryAfterMs) || 0
        : retryAfterMs(null);
    await sleep(waitMs);
    // Retry once after the backoff; quota-spent still throws through.
    return await parseBatch(await postOnce());
  }
}

/**
 * THE full-mock pipeline. Bank-first per subject → remainder chunked into
 * ≤12-question batches fired SEQUENTIALLY with ~8s stagger (Groq free
 * tier rate-limits per minute — the old parallel spike 429d most batches
 * and silently degraded to bank repeats) → per-batch verbatim fallback on
 * failure (429s get one Retry-After backoff + one retry first). Records
 * exposure + recency once per deal (StrictMode-safe via one shared
 * in-flight promise). The daily print quota ("mock-quota-spent") throws
 * through — no silent fallback — so the UI can show the honest dossier
 * line. Any other failure never throws: worst case is a 200Q paper with
 * some bank repeats.
 */
let inflightMock: Promise<Question[]> | null = null;

export function buildMockQuestions(opts?: { staggerMs?: number }): Promise<Question[]> {
  if (inflightMock) return inflightMock;
  const run = async (): Promise<Question[]> => {
    try {
      const fills = planMockFill();
      const slugOf = (s: string) => `mock-${mockSlug(s)}-b`;

      // 1) Bank-first per subject (unique while the pool allows).
      const bankBySubject = new Map<string, Question[]>();
      const allBankIds: string[] = [];
      fills.forEach((f, fi) => {
        const dealt = dealBankVerbatim(f.subject, f.bankTake, `${slugOf(f.subject)}${fi}`);
        bankBySubject.set(f.subject, dealt.questions);
        allBankIds.push(...dealt.bankIds);
      });

      // 2) Groq remainder in SEQUENTIAL batches with stagger; per-batch
      // bank fallback (429s already backed off + retried once inside).
      const batches = planMockBatches(fills);
      const staggerMs = opts?.staggerMs ?? getMockStaggerMs();
      const batchResults: Question[][] = [];
      for (let bi = 0; bi < batches.length; bi++) {
        if (bi > 0 && staggerMs > 0) await sleep(staggerMs);
        const batch = batches[bi];
        try {
          batchResults.push(await tryGroqMockRoute(batch, bi));
        } catch (e) {
          if (e instanceof Error && e.message === MOCK_QUOTA_SPENT_ERROR) throw e;
          const fb: Question[] = [];
          for (const block of batch) {
            const dealt = dealBankVerbatim(block.subject, block.count, `${slugOf(block.subject)}f${bi}`);
            fb.push(...dealt.questions);
            allBankIds.push(...dealt.bankIds);
          }
          batchResults.push(fb);
        }
      }

      // 3) Assemble in subject order: bank takes, then generated.
      const genBySubject = new Map<string, Question[]>();
      for (const qs of batchResults) {
        for (const q of qs) {
          const list = genBySubject.get(q.section) ?? [];
          list.push(q);
          genBySubject.set(q.section, list);
        }
      }
      const paper: Question[] = [];
      for (const f of fills) {
        paper.push(...(bankBySubject.get(f.subject) ?? []));
        paper.push(...(genBySubject.get(f.subject) ?? []));
      }

      // 4) One exposure + recency increment for the whole deal.
      recordSeenQuestionIds(allBankIds);
      recordExposureIds([...allBankIds, ...paper.map((q) => q.id)]);
      return paper;
    } catch (e) {
      if (e instanceof Error && e.message === MOCK_QUOTA_SPENT_ERROR) throw e;
      // Absolute last resort (empty bank?): cycle the whole bank verbatim.
      const fb: Question[] = [];
      const bankIds: string[] = [];
      for (let k = 0; k < MOCK_TOTAL_QUESTIONS; k++) {
        const pick = nustSeedQuestions[k % Math.max(nustSeedQuestions.length, 1)];
        if (!pick) break;
        bankIds.push(pick.id);
        fb.push(
          shuffleOptions({
            id: `mock-last-b${k + 1}`,
            section: pick.section,
            topic: pick.topic,
            subtopic: pick.subtopic,
            text: sanitizeStem(pick.text),
            options: [...pick.options],
            correctIndex: pick.correctIndex,
            explanation: sanitizeStem(pick.explanation),
            isPlaceholder: false,
          }),
        );
      }
      recordSeenQuestionIds(bankIds);
      recordExposureIds([...bankIds, ...fb.map((q) => q.id)]);
      return fb;
    } finally {
      if (inflightMock === promise) inflightMock = null;
    }
  };
  const promise = run();
  inflightMock = promise;
  return promise;
}
