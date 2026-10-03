import type {
  ErrorType,
  ExamConfig,
  Mistake,
  Question,
  Session,
  WeaknessNode,
} from "@/types";

/** Sentinel answer recorded when the per-question timer expires. */
export const TIMEOUT_ANSWER = -1;
export function nodeKey(topic: string, subtopic: string): string {
  return `${topic}::${subtopic}`;
}

/**
 * Pure answer → mistakes fold, shared by the session page and tests.
 *
 * - `null` (question never reached): skipped, never a mistake.
 * - `TIMEOUT_ANSWER` (-1, timer expired): a mistake with errorType
 *   "time-pressure". Running out of time IS the classification — no
 *   further classification step applies.
 * - correct index: counted, never a mistake.
 * - any other wrong index: a mistake with the user's classification, or
 *   "concept-gap" when unclassified.
 */
export function mistakesFromAnswers(
  questions: Question[],
  answers: (number | null)[],
  errorKinds: (ErrorType | null)[],
  sessionId: string,
  now: number,
): { correct: number; mistakes: Mistake[] } {
  let correct = 0;
  const mistakes: Mistake[] = [];
  questions.forEach((q, qi) => {
    const sel = answers[qi] ?? null;
    if (sel === null) return;
    if (sel === q.correctIndex) {
      correct += 1;
      return;
    }
    mistakes.push({
      id: `mistake-${sessionId}-${qi}`,
      questionId: q.id,
      topic: q.topic,
      subtopic: q.subtopic,
      errorType: (sel === TIMEOUT_ANSWER ? "time-pressure" : (errorKinds[qi] ?? "concept-gap")) as ErrorType,
      timestamp: now,
      sessionId,
    });
  });
  return { correct, mistakes };
}

/**
 * Full-mock global expiry: every unanswered question files as a
 * time-pressure mistake (sentinel answer, same as a per-question timeout).
 * Answered questions are untouched. Pure — the session page applies it
 * when the 180:00 countdown reaches zero, then finishes.
 */
export function applyMockExpiry(
  answers: (number | null)[],
  errorKinds: (ErrorType | null)[],
): { answers: (number | null)[]; errorKinds: (ErrorType | null)[] } {
  return {
    answers: answers.map((a) => (a === null ? TIMEOUT_ANSWER : a)),
    errorKinds: errorKinds.map((e, i) => (answers[i] === null ? "time-pressure" : e)),
  };
}

export const ERROR_TYPES: {
  value: ErrorType;
  label: string;
  description: string;
}[] = [
  { value: "concept-gap", label: "CONCEPT GAP", description: "Did not know the concept" },
  { value: "misread", label: "MISREAD", description: "Misunderstood what was asked" },
  { value: "time-pressure", label: "TIME PRESSURE", description: "Knew it but ran out of time" },
  { value: "silly-mistake", label: "SILLY MISTAKE", description: "Careless sign / unit / arithmetic" },
  { value: "formula-error", label: "FORMULA ERROR", description: "Wrong or misapplied formula" },
];

const WEAKNESS_KEY = "nevertwice-weakness";
const SESSIONS_KEY = "nevertwice-sessions";
const LAST_DETAIL_KEY = "nevertwice-last-detail";

export interface SessionDetailAnswer {
  questionId: string;
  section: string;
  topic: string;
  subtopic: string;
  selected: number | null;
  correctIndex: number;
  isCorrect: boolean;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / private mode — ignore
  }
}

export class ExamEngine {
  private config: ExamConfig;

  constructor(config: ExamConfig) {
    this.config = config;
  }

  getConfig(): ExamConfig {
    return this.config;
  }

  getSecondsPerQuestion(): number {
    return this.config.secondsPerQuestion;
  }

  // ---------- static storage / scoring (generic, no exam import) ----------

  static getWeaknessNodes(): WeaknessNode[] {
    return readJson<WeaknessNode[]>(WEAKNESS_KEY, []);
  }

  static getSessions(): Session[] {
    return readJson<Session[]>(SESSIONS_KEY, []);
  }

  static saveSession(session: Session): void {
    const sessions = ExamEngine.getSessions();
    sessions.unshift(session);
    writeJson(SESSIONS_KEY, sessions.slice(0, 50));
  }

  static saveLastDetail(detail: SessionDetailAnswer[]): void {
    writeJson(LAST_DETAIL_KEY, detail);
  }

  static loadLastDetail(): SessionDetailAnswer[] {
    return readJson<SessionDetailAnswer[]>(LAST_DETAIL_KEY, []);
  }

  static updateMistakeErrorType(mistakeId: string, errorType: ErrorType): Session[] {
    const sessions = ExamEngine.getSessions();
    let changed = false;
    sessions.forEach((s) => {
      s.mistakes.forEach((m: Mistake) => {
        if (m.id === mistakeId) {
          m.errorType = errorType;
          changed = true;
        }
      });
    });
    if (changed) writeJson(SESSIONS_KEY, sessions);
    return sessions;
  }

  /**
   * Fold one finished session into the weakness graph.
   * - mistaken subtopics: mistakeCount +1, trend rising
   * - attempted this session but clean: mistakeCount -1 (min 0), trend falling
   * - never attempted this session: untouched (stable) — a clean
   *   Differentiation drill must NOT wipe a legitimate Atomic Structure fault
   * - legacy sessions without attemptedKeys: skip decay entirely (stable)
   * Returns previous snapshot + updated nodes + changed keys for animation.
   */
  static recordSession(session: Session): {
    previous: WeaknessNode[];
    nodes: WeaknessNode[];
    changedKeys: string[];
  } {
    const previous = ExamEngine.getWeaknessNodes();
    const prevMap = new Map(previous.map((n) => [nodeKey(n.topic, n.subtopic), n]));
    const mistakenKeys = new Set(
      session.mistakes.map((m) => nodeKey(m.topic, m.subtopic)),
    );
    // Legacy sessions predate attempted-tracking: decay nothing.
    const attemptedKeys = session.attemptedKeys ? new Set(session.attemptedKeys) : null;
    const changedKeys: string[] = [];

    const next = new Map<string, WeaknessNode>();
    prevMap.forEach((node, key) => {
      if (mistakenKeys.has(key)) {
        const count = node.mistakeCount + 1;
        next.set(key, { ...node, mistakeCount: count, lastSeen: session.date, trend: "rising" });
        changedKeys.push(key);
      } else if (attemptedKeys !== null && attemptedKeys.has(key)) {
        // Attempted but clean this session: decay toward strong.
        if (node.mistakeCount > 0) {
          next.set(key, {
            ...node,
            mistakeCount: Math.max(0, node.mistakeCount - 1),
            trend: "falling",
          });
          changedKeys.push(key);
        } else {
          next.set(key, { ...node, trend: "stable" });
        }
      } else {
        // Untouched this session (or legacy session): stable.
        next.set(key, { ...node, trend: "stable" });
      }
    });

    session.mistakes.forEach((m) => {
      const key = nodeKey(m.topic, m.subtopic);
      if (!next.has(key)) {
        next.set(key, {
          topic: m.topic,
          subtopic: m.subtopic,
          mistakeCount: 1,
          lastSeen: m.timestamp,
          trend: "rising",
        });
        changedKeys.push(key);
      } else {
        // Already handled above via mistakenKeys; ensure lastSeen is fresh.
        const existing = next.get(key)!;
        next.set(key, { ...existing, lastSeen: Math.max(existing.lastSeen, m.timestamp) });
      }
    });

    const nodes = Array.from(next.values());
    writeJson(WEAKNESS_KEY, nodes);
    return { previous, nodes, changedKeys };
  }

  static clearAll(): void {
    if (!isBrowser()) return;
    localStorage.removeItem(WEAKNESS_KEY);
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(LAST_DETAIL_KEY);
  }

  // ---------- dossier custody (export / import, no backend) ----------

  /** The three persistent dossier keys. The transient active-drill key is never exported. */
  static dossierKeys(): { weakness: string; sessions: string; lastDetail: string } {
    return { weakness: WEAKNESS_KEY, sessions: SESSIONS_KEY, lastDetail: LAST_DETAIL_KEY };
  }
}

/** Serializable dossier snapshot: the three persistent keys, nothing transient. */
export interface DossierExport {
  version: 1;
  exportedAt: number;
  weakness: WeaknessNode[];
  sessions: Session[];
  lastDetail: SessionDetailAnswer[];
}

/** Read the live dossier from storage as an exportable snapshot. */
export function exportDossierSnapshot(): DossierExport {
  return {
    version: 1,
    exportedAt: Date.now(),
    weakness: ExamEngine.getWeaknessNodes(),
    sessions: ExamEngine.getSessions(),
    lastDetail: ExamEngine.loadLastDetail(),
  };
}

const VALID_TRENDS = new Set(["rising", "falling", "stable"]);
const VALID_ERRORS: Set<string> = new Set([
  "concept-gap",
  "misread",
  "time-pressure",
  "silly-mistake",
  "formula-error",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Prototype-pollution guard: JSON.parse is safe on its own (__proto__ lands
 * as an own property), but merged/copied keys named __proto__/constructor/
 * prototype can hijack Object.prototype downstream. Legit dossier exports
 * never contain these keys — reject the whole file if any object does.
 */
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function hasDangerousKeys(v: Record<string, unknown>): boolean {
  for (const k of Object.keys(v)) {
    if (DANGEROUS_KEYS.has(k)) return true;
  }
  return false;
}

/**
 * Validate a parsed JSON value as a dossier snapshot. Accepts the exact
 * shape exportDossierSnapshot() writes; rejects anything else with an
 * honest one-line reason. Extra fields are ignored, optional fields
 * (attemptedKeys) may be absent.
 */
export function validateDossierImport(
  parsed: unknown,
): { ok: true; data: DossierExport } | { ok: false; error: string } {
  if (!isRecord(parsed)) return { ok: false, error: "Not a dossier file: expected a JSON object." };
  if (hasDangerousKeys(parsed)) {
    return { ok: false, error: "Not a dossier file: forbidden keys present." };
  }
  const { weakness, sessions, lastDetail } = parsed;
  if (!Array.isArray(weakness) || !Array.isArray(sessions) || !Array.isArray(lastDetail)) {
    return {
      ok: false,
      error: "Not a dossier file: expected weakness, sessions and lastDetail arrays.",
    };
  }
  for (let i = 0; i < weakness.length; i++) {
    const n = weakness[i] as Record<string, unknown>;
    if (
      !isRecord(n) ||
      hasDangerousKeys(n) ||
      typeof n.topic !== "string" ||
      typeof n.subtopic !== "string" ||
      typeof n.mistakeCount !== "number" ||
      Number.isNaN(n.mistakeCount) ||
      (n.mistakeCount as number) < 0 ||
      typeof n.lastSeen !== "number" ||
      typeof n.trend !== "string" ||
      !VALID_TRENDS.has(n.trend as string)
    ) {
      return { ok: false, error: `Not a dossier file: weakness[${i}] is malformed.` };
    }
  }
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i] as Record<string, unknown>;
    if (
      !isRecord(s) ||
      hasDangerousKeys(s) ||
      typeof s.id !== "string" ||
      typeof s.date !== "number" ||
      typeof s.questionsAttempted !== "number" ||
      typeof s.correct !== "number" ||
      !Array.isArray(s.mistakes) ||
      typeof s.durationSeconds !== "number"
    ) {
      return { ok: false, error: `Not a dossier file: sessions[${i}] is malformed.` };
    }
    for (let j = 0; j < (s.mistakes as unknown[]).length; j++) {
      const m = (s.mistakes as unknown[])[j] as Record<string, unknown>;
      if (
        !isRecord(m) ||
        hasDangerousKeys(m) ||
        typeof m.id !== "string" ||
        typeof m.questionId !== "string" ||
        typeof m.topic !== "string" ||
        typeof m.subtopic !== "string" ||
        typeof m.errorType !== "string" ||
        !VALID_ERRORS.has(m.errorType as string) ||
        typeof m.timestamp !== "number" ||
        typeof m.sessionId !== "string"
      ) {
        return { ok: false, error: `Not a dossier file: sessions[${i}].mistakes[${j}] is malformed.` };
      }
    }
  }
  for (let i = 0; i < lastDetail.length; i++) {
    const d = lastDetail[i] as Record<string, unknown>;
    if (
      !isRecord(d) ||
      hasDangerousKeys(d) ||
      typeof d.questionId !== "string" ||
      typeof d.section !== "string" ||
      typeof d.topic !== "string" ||
      typeof d.subtopic !== "string" ||
      (d.selected !== null && typeof d.selected !== "number") ||
      typeof d.correctIndex !== "number" ||
      !Number.isInteger(d.correctIndex as number) ||
      typeof d.isCorrect !== "boolean"
    ) {
      return { ok: false, error: `Not a dossier file: lastDetail[${i}] is malformed.` };
    }
  }
  return {
    ok: true,
    data: {
      version: 1,
      exportedAt:
        typeof (parsed as Record<string, unknown>).exportedAt === "number"
          ? ((parsed as Record<string, unknown>).exportedAt as number)
          : Date.now(),
      weakness: weakness as WeaknessNode[],
      sessions: sessions as Session[],
      lastDetail: lastDetail as SessionDetailAnswer[],
    },
  };
}

/** Replace the three persistent dossier keys with validated import data. */
export function importDossierSnapshot(data: DossierExport): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(WEAKNESS_KEY, JSON.stringify(data.weakness));
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(data.sessions));
    localStorage.setItem(LAST_DETAIL_KEY, JSON.stringify(data.lastDetail));
  } catch {
    // storage full / private mode — the board keeps its current state
  }
}
