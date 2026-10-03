import type { Session } from "@/types";

/**
 * LONG-TERM TRAJECTORY data — pure helpers behind src/components/Trajectory.
 * Only real filed sessions, never interpolated: x-axis is session order,
 * not calendar days. Mock sessions count exactly like normal sessions.
 */

export interface TrajectoryPoint {
  id: string;
  date: number;
  accuracy: number;
  mistakes: number;
  questions: number;
}

export interface TrajectoryStats {
  count: number;
  first: number;
  latest: number;
  delta: number;
  totalReps: number;
}

/** Per-session accuracy, rounded. A 0-question session scores 0, never NaN. */
export function sessionAccuracy(s: Pick<Session, "correct" | "questionsAttempted">): number {
  if (s.questionsAttempted <= 0) return 0;
  return Math.round((s.correct / s.questionsAttempted) * 100);
}

/** Real filed sessions only, oldest first. No interpolation, no phantom points. */
export function buildTrajectory(sessions: Session[]): TrajectoryPoint[] {
  return [...sessions]
    .sort((a, b) => a.date - b.date)
    .map((s) => ({
      id: s.id,
      date: s.date,
      accuracy: sessionAccuracy(s),
      mistakes: s.mistakes.length,
      questions: s.questionsAttempted,
    }));
}

export function trajectoryStats(points: TrajectoryPoint[]): TrajectoryStats {
  if (points.length === 0) return { count: 0, first: 0, latest: 0, delta: 0, totalReps: 0 };
  const first = points[0].accuracy;
  const latest = points[points.length - 1].accuracy;
  return {
    count: points.length,
    first,
    latest,
    delta: latest - first,
    totalReps: points.reduce((n, p) => n + p.questions, 0),
  };
}

/** "3 OCT" — day + short month, locale-independent. */
export function shortDate(ts: number): string {
  const d = new Date(ts);
  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return `${d.getDate()} ${month}`;
}

/** "+30" / "-5" / "±0" for the Δ readout. */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "±0";
}
