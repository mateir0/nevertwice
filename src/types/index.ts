export type ErrorType =
  | "concept-gap"
  | "misread"
  | "time-pressure"
  | "silly-mistake"
  | "formula-error";

export interface Mistake {
  id: string;
  questionId: string;
  topic: string;
  subtopic: string;
  errorType: ErrorType;
  timestamp: number;
  sessionId: string;
}

export interface Session {
  id: string;
  date: number;
  questionsAttempted: number;
  correct: number;
  mistakes: Mistake[];
  durationSeconds: number;
  /**
   * "topic::subtopic" keys for every question shown in the session.
   * Drives scoped decay in recordSession: only attempted subtopics may
   * decay. Absent on legacy sessions (pre-decay-scoping) — those skip
   * decay entirely rather than guessing.
   */
  attemptedKeys?: string[];
}

export type WeaknessTrend = "rising" | "stable" | "falling";

export interface WeaknessNode {
  topic: string;
  subtopic: string;
  mistakeCount: number;
  lastSeen: number;
  trend: WeaknessTrend;
}

export interface Question {
  id: string;
  section: string;
  topic: string;
  subtopic: string;
  text: string;
  options: string[];
  correctIndex: number;
  /** Post-answer debrief: 1–3 sentences naming the right option and why the
   *  key distractor is wrong. Unicode math notation, never LaTeX. */
  explanation: string;
  isPlaceholder: boolean;
}

export interface TopicConfig {
  id: string;
  name: string;
  subtopics: string[];
}

export interface SectionConfig {
  id: string;
  name: string;
  questionCount: number;
  topics: TopicConfig[];
}

export interface ExamConfig {
  id: string;
  name: string;
  shortName: string;
  totalQuestions: number;
  totalMinutes: number;
  secondsPerQuestion: number;
  negativeMarking: boolean;
  sections: SectionConfig[];
}
