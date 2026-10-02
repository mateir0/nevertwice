import type {
  ErrorType,
  ExamConfig,
  Mistake,
  Session,
  WeaknessNode,
} from "@/types";

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

function nodeKey(topic: string, subtopic: string): string {
  return `${topic}::${subtopic}`;
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
   * - previously-seen but clean this session: mistakeCount -1 (min 0), trend falling
   * - untouched: stable
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
    const changedKeys: string[] = [];

    const next = new Map<string, WeaknessNode>();
    prevMap.forEach((node, key) => {
      if (mistakenKeys.has(key)) {
        const count = node.mistakeCount + 1;
        next.set(key, { ...node, mistakeCount: count, lastSeen: session.date, trend: "rising" });
        changedKeys.push(key);
      } else {
        // Clean session for a known-weak node: decay toward strong.
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
}
