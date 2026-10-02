import { ExamEngine } from "./exam-engine";
import type { DrillGenTarget } from "./question-generator";
import type { ErrorType, Question, WeaknessNode } from "@/types";

/**
 * The drill engine scorer: mistakes → weakness graph → targeted drill.
 * planDrill() scores every weakness node as
 *   mistakeCount × recency × errorSeverity
 * and picks targets for a 5–8 question drill weighted toward the hottest
 * nodes. Synchronous, offline, and question-free: it returns scoring
 * (targets + reason) only. Question text is built separately via the
 * async buildDrillQuestions() pipeline (Groq → fallback → shuffle), so
 * the planner itself never touches the network and never emits questions.
 *
 * Callers (/app, /results) MUST attach questions before saving:
 *   const plan = planDrill();
 *   const questions = await buildDrillQuestions(plan.targets);
 *   saveActiveDrill({ ...plan, questions });
 */

export interface DrillTarget {
  topic: string;
  subtopic: string;
  score: number;
  errorType: ErrorType;
  count: number;
}

export interface DrillPlan {
  id: string;
  createdAt: number;
  targets: DrillTarget[];
  reason: string;
  /** Empty until the caller fills it via buildDrillQuestions(). */
  questions: Question[];
}

export const ACTIVE_DRILL_KEY = "nevertwice:active-drill";

const SEVERITY: Record<ErrorType, number> = {
  "concept-gap": 1.5,
  "formula-error": 1.3,
  misread: 1.2,
  "time-pressure": 1.1,
  "silly-mistake": 0.8,
};

const ERROR_NOUN: Record<ErrorType, string> = {
  "concept-gap": "concept gaps",
  misread: "misreads",
  "formula-error": "formula errors",
  "time-pressure": "time stalls",
  "silly-mistake": "silly mistakes",
};

const ERROR_VERB: Record<ErrorType, string> = {
  "concept-gap": "rebuild the foundation",
  "formula-error": "force the right formula first",
  misread: "punish skimming",
  "time-pressure": "drill the 30-second shortcut",
  "silly-mistake": "punish sloppiness",
};

const DAY_MS = 86400000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

interface Scored {
  node: WeaknessNode;
  score: number;
  count: number;
  errorType: ErrorType;
  spanDays: number;
}

function dominantError(topic: string, subtopic: string, now: number): { errorType: ErrorType; count: number; spanDays: number } {
  const mistakes = ExamEngine.getSessions().flatMap((s) => s.mistakes).filter((m) => m.topic === topic && m.subtopic === subtopic);
  if (mistakes.length === 0) return { errorType: "concept-gap", count: 0, spanDays: 1 };
  const tallies = new Map<ErrorType, number>();
  let earliest = now;
  mistakes.forEach((m) => {
    tallies.set(m.errorType, (tallies.get(m.errorType) ?? 0) + 1);
    if (m.timestamp < earliest) earliest = m.timestamp;
  });
  let best: ErrorType = "concept-gap";
  let bestCount = -1;
  tallies.forEach((n, e) => {
    if (n > bestCount) {
      best = e;
      bestCount = n;
    }
  });
  return { errorType: best, count: mistakes.length, spanDays: Math.max(1, Math.ceil((now - earliest) / DAY_MS)) };
}

function scoreNode(node: WeaknessNode, now: number): Scored | null {
  if (node.mistakeCount <= 0) return null;
  const daysSince = Math.max(0, (now - node.lastSeen) / DAY_MS);
  const recency = Math.exp(-daysSince / 7);
  const dom = dominantError(node.topic, node.subtopic, now);
  const score = node.mistakeCount * recency * SEVERITY[dom.errorType];
  return { node, score, count: dom.count > 0 ? dom.count : node.mistakeCount, errorType: dom.errorType, spanDays: dom.spanDays };
}

/** Split `total` questions across targets proportional to score, min 1 each. */
function allocateCounts(sorted: Scored[], total: number): number[] {
  const sum = sorted.reduce((n, s) => n + s.score, 0) || 1;
  const counts = sorted.map((s) => Math.max(1, Math.round((s.score / sum) * total)));
  let diff = total - counts.reduce((n, c) => n + c, 0);
  let i = 0;
  while (diff !== 0 && counts.length > 0) {
    const idx = i % counts.length;
    if (diff > 0) {
      counts[idx] += 1;
      diff -= 1;
    } else if (counts[idx] > 1) {
      counts[idx] -= 1;
      diff += 1;
    }
    i += 1;
    if (i > 100) break;
  }
  return counts;
}

function buildReason(top: Scored, total: number): string {
  const noun = ERROR_NOUN[top.errorType];
  const verb = ERROR_VERB[top.errorType];
  const dayWord = top.spanDays === 1 ? "day" : "days";
  return `${top.node.subtopic} keeps bleeding — ${top.count} ${noun} in ${top.spanDays} ${dayWord}. ${total} questions engineered to ${verb}.`;
}

/** Convert plan targets into generator targets for buildDrillQuestions(). */
export function planToGenTargets(plan: DrillPlan): DrillGenTarget[] {
  return plan.targets.map((t) => ({
    topic: t.topic,
    subtopic: t.subtopic,
    errorType: t.errorType,
    count: t.count,
  }));
}

/**
 * Score the weakness graph and return a targeted drill plan (scoring
 * only — questions: []), or null when the graph is empty (fresh user).
 */
export function planDrill(now: number = Date.now()): DrillPlan | null {
  const nodes = ExamEngine.getWeaknessNodes();
  const scored = nodes
    .map((n) => scoreNode(n, now))
    .filter((s): s is Scored => s !== null)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return null;

  const picked = scored.slice(0, Math.min(3, scored.length));
  const total = picked.length === 1 ? 6 : picked.length === 2 ? 7 : 8;
  const counts = allocateCounts(picked, total);

  const targets: DrillTarget[] = picked.map((s, i) => ({
    topic: s.node.topic,
    subtopic: s.node.subtopic,
    score: s.score,
    errorType: s.errorType,
    count: counts[i],
  }));

  return {
    id: `drill-${now}`,
    createdAt: now,
    targets,
    reason: buildReason(picked[0], total),
    questions: [],
  };
}

// ---------- active-drill localStorage wiring ----------

export function saveActiveDrill(plan: DrillPlan): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(ACTIVE_DRILL_KEY, JSON.stringify(plan));
  } catch {
    // storage full / private mode — ignore
  }
}

export function loadActiveDrill(): DrillPlan | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(ACTIVE_DRILL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DrillPlan;
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveDrill(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACTIVE_DRILL_KEY);
}
