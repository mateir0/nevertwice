"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";
import { ERROR_TYPES, ExamEngine } from "@/engine/exam-engine";
import type { ErrorType, Session } from "@/types";

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function errorLabel(v: ErrorType): string {
  return ERROR_TYPES.find((t) => t.value === v)?.label ?? v.toUpperCase();
}

export default function ResultsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [nodes, setNodes] = useState(ExamEngine.getWeaknessNodes());

  useEffect(() => {
    const sessions = ExamEngine.getSessions();
    setSession(sessions[0] ?? null);
    setNodes(ExamEngine.getWeaknessNodes());
  }, []);

  const detail = useMemo(() => ExamEngine.loadLastDetail(), [session]);

  const perSection = useMemo(() => {
    const map = new Map<string, { attempted: number; correct: number }>();
    detail.forEach((d) => {
      const cur = map.get(d.section) ?? { attempted: 0, correct: 0 };
      cur.attempted += 1;
      if (d.isCorrect) cur.correct += 1;
      map.set(d.section, cur);
    });
    return Array.from(map.entries());
  }, [detail]);

  const highlightKeys = useMemo(() => {
    if (!session) return [];
    return session.mistakes.map((m) => `${m.topic}::${m.subtopic}`);
  }, [session]);

  function reclassify(mistakeId: string, v: ErrorType): void {
    const sessions = ExamEngine.updateMistakeErrorType(mistakeId, v);
    setSession(sessions[0] ?? null);
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] items-center justify-center px-4">
        <div className="text-center">
          <p className="font-display text-4xl tracking-wide text-ink">NO SESSION DATA</p>
          <p className="mt-2 font-mono text-sm text-ink/70">RUN A SESSION FIRST.</p>
          <Link href="/app" className="btn-primary mt-6 inline-block">
            HOME
          </Link>
        </div>
      </div>
    );
  }

  const acc = session.questionsAttempted > 0 ? Math.round((session.correct / session.questionsAttempted) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 py-6">
      <header className="mb-5 text-center">
        <h1 className="font-display text-5xl tracking-wide text-ink">RESULTS</h1>
        <p className="mt-1 font-mono text-xs tracking-widest text-ink/70">
          {new Date(session.date).toLocaleString()}
        </p>
      </header>

      <main className="space-y-5">
        <section aria-label="Score summary" className="card reveal">
          <h2 className="font-display text-2xl tracking-wide text-ink">SESSION SUMMARY</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { v: `${acc}%`, l: "ACCURACY", bg: "#008080", fg: "#FFFDF5" },
              { v: `${session.correct}/${session.questionsAttempted}`, l: "CORRECT", bg: "#008080", fg: "#FFFDF5" },
              { v: `${session.mistakes.length}`, l: "MISTAKES", bg: "#5C0000", fg: "#F5DEB3" },
              { v: formatDuration(session.durationSeconds), l: "DURATION", bg: "#B87333", fg: "#FFFDF5" },
            ].map((s) => (
              <div key={s.l} className="copper-border bg-parchment p-3 text-center">
                <p className="font-mono inline-block rounded px-3 text-3xl font-bold" style={{ backgroundColor: s.bg, color: s.fg }}>
                  {s.v}
                </p>
                <p className="mt-2 font-mono text-[11px] tracking-widest text-ink/70">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {perSection.length > 0 && (
          <section aria-label="Per-section breakdown" className="card">
            <h2 className="font-display text-2xl tracking-wide text-ink">PER-SECTION BREAKDOWN</h2>
            <ul className="mt-3 space-y-2">
              {perSection.map(([section, s]) => {
                const pct = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
                return (
                  <li key={section} className="copper-border bg-parchment p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xl tracking-wide text-ink">{section}</span>
                      <span className="font-mono text-sm text-ink">
                        {s.correct}/{s.attempted} • {pct}%
                      </span>
                    </div>
                    <div className="copper-border mt-2 h-2 overflow-hidden bg-ivory" aria-hidden="true">
                      <div className="h-full bg-teal transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-label="Mistakes" className="card">
          <h2 className="font-display text-2xl tracking-wide text-ink">
            MISTAKES <span className="rounded bg-mahogany px-2 py-0.5 font-mono text-base font-bold text-parchment">({session.mistakes.length})</span>
          </h2>
          {session.mistakes.length === 0 ? (
            <p className="mt-2 font-display text-[17px] text-ink">
              <span className="rounded bg-teal px-2 py-0.5 font-mono text-sm font-bold text-ivory">CLEAN</span> NOTHING TO CLASSIFY.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {session.mistakes.map((m) => (
                <li key={m.id} className="copper-border bg-parchment p-3">
                  <p className="font-mono text-xs text-ink/70">
                    {m.topic} / {m.subtopic}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-ink/70">{m.questionId}</span>
                    <select
                      aria-label={`Error type for ${m.questionId}`}
                      value={m.errorType}
                      onChange={(e) => reclassify(m.id, e.target.value as ErrorType)}
                      className="input-field w-auto px-2 py-1 font-mono text-sm"
                    >
                      {ERROR_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 font-mono text-sm font-bold tracking-wide text-mahogany">
                    {errorLabel(m.errorType)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <WeaknessHeatmap nodes={nodes} title="HEATMAP — WHAT CHANGED" highlightKeys={highlightKeys} />
        <p className="text-center font-mono text-[11px] text-ink/70">
          HIGHLIGHTED NODES MOVED THIS SESSION • SAME CIRCUIT THE SESSION WRITES TO
        </p>
      </main>

      <footer className="mt-6 space-y-3">
        <Link href="/session" className="btn-primary block text-center">
          ANOTHER SESSION
        </Link>
        <Link href="/app" className="btn-secondary block text-center">
          BACK TO APP
        </Link>
      </footer>
    </div>
  );
}
