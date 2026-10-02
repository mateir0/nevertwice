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
          <p className="font-display text-3xl tracking-widest text-tape-red">NO SESSION DATA</p>
          <p className="mt-2 font-mono text-sm text-static-grey">RUN A SESSION FIRST.</p>
          <Link href="/" className="btn-primary mt-6 inline-block">
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
        <h1 className="font-display text-4xl tracking-widest text-crt-green">RESULTS</h1>
        <p className="mt-1 font-mono text-xs tracking-widest text-static-grey">
          {new Date(session.date).toLocaleString()}
        </p>
      </header>

      <main className="space-y-5">
        <section aria-label="Score summary" className="card crt-glow">
          <h2 className="font-display text-xl tracking-widest">SESSION SUMMARY</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { v: `${acc}%`, l: "ACCURACY", c: "#33FF00" },
              { v: `${session.correct}/${session.questionsAttempted}`, l: "CORRECT", c: "#33FF00" },
              { v: `${session.mistakes.length}`, l: "MISTAKES", c: "#CC0000" },
              { v: formatDuration(session.durationSeconds), l: "DURATION", c: "#FFB000" },
            ].map((s) => (
              <div key={s.l} className="terminal-border bg-terminal-bg p-3 text-center">
                <p className="font-display text-3xl" style={{ color: s.c }}>
                  {s.v}
                </p>
                <p className="font-mono text-[11px] tracking-widest text-static-grey">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        {perSection.length > 0 && (
          <section aria-label="Per-section breakdown" className="card">
            <h2 className="font-display text-xl tracking-widest">PER-SECTION BREAKDOWN</h2>
            <ul className="mt-3 space-y-2">
              {perSection.map(([section, s]) => {
                const pct = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
                return (
                  <li key={section} className="terminal-border bg-terminal-bg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-lg tracking-widest">{section}</span>
                      <span className="font-mono text-sm">
                        {s.correct}/{s.attempted} • {pct}%
                      </span>
                    </div>
                    <div className="terminal-border mt-2 h-2 overflow-hidden bg-charcoal" aria-hidden="true">
                      <div className="h-full bg-crt-green" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-label="Mistakes" className="card">
          <h2 className="font-display text-xl tracking-widest">
            MISTAKES <span className="text-tape-red">({session.mistakes.length})</span>
          </h2>
          {session.mistakes.length === 0 ? (
            <p className="mt-2 font-mono text-sm text-crt-green">CLEAN RUN. NOTHING TO CLASSIFY.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {session.mistakes.map((m) => (
                <li key={m.id} className="terminal-border bg-terminal-bg p-3">
                  <p className="font-mono text-xs text-static-grey">
                    {m.topic} / {m.subtopic}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-static-grey">{m.questionId}</span>
                    <select
                      aria-label={`Error type for ${m.questionId}`}
                      value={m.errorType}
                      onChange={(e) => reclassify(m.id, e.target.value as ErrorType)}
                      className="input-field w-auto px-2 py-1 font-display text-sm"
                    >
                      {ERROR_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 font-display text-sm tracking-widest text-phosphor-amber">
                    {errorLabel(m.errorType)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <WeaknessHeatmap nodes={nodes} title="HEATMAP — WHAT CHANGED" highlightKeys={highlightKeys} />
        <p className="text-center font-mono text-[11px] text-static-grey">
          HIGHLIGHTED CELLS MOVED THIS SESSION • SAME GRAPH THE SESSION WRITES TO
        </p>
      </main>

      <footer className="mt-6 space-y-3">
        <Link href="/session" className="btn-primary block text-center">
          ANOTHER SESSION
        </Link>
        <Link href="/" className="btn-secondary block text-center">
          BACK TO HOME
        </Link>
      </footer>
    </div>
  );
}
