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
