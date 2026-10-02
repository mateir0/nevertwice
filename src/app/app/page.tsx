"use client";

import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";
import { RecentSessions } from "@/components/RecentSessions";
import { useSessions, useWeaknessNodes } from "@/hooks/useExam";

export default function AppDashboard() {
  const nodes = useWeaknessNodes();
  const { sessions } = useSessions();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
      <header className="terminal-border mb-6 flex items-center justify-between gap-3 bg-charcoal px-4 py-2.5">
        <Link href="/" className="font-display text-lg tracking-widest text-crt-green">
          ← NEVERTWICE
        </Link>
        <span className="font-mono text-[11px] tracking-widest text-static-grey">
          APP // SESSION CONSOLE
        </span>
      </header>

      <div className="mb-6">
        <Wordmark align="center" size="clamp(2.5rem, 5vw, 3.5rem)" />
        <p className="mt-1 text-center font-mono text-xs tracking-widest text-static-grey">
          NUST ENTRY TEST • RE-PREPARATION MODE
        </p>
      </div>

      <main className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-start">
        <div className="space-y-5">
          <section aria-label="Next step" className="card crt-glow">
            <p className="font-mono text-[11px] tracking-widest text-static-grey">
              YOUR NEXT 15 MINUTES
            </p>
            <p className="font-display mt-1 text-2xl tracking-wide">
              20 QUESTIONS • 18 MINUTES • PACED
            </p>
            <p className="mt-1 font-mono text-sm text-static-grey">
              One question at a time. Wrong answers get classified so the heatmap learns.
            </p>
            <Link href="/session" className="btn-primary mt-4 block text-center text-lg">
              BEGIN
            </Link>
          </section>

          <WeaknessHeatmap nodes={nodes} title="WEAKNESS HEATMAP" />
        </div>

        <div className="space-y-5">
          <RecentSessions sessions={sessions} />
          <section aria-label="NET format reminder" className="card">
            <h2 className="font-display text-xl tracking-widest text-phosphor-amber">NET FORMAT</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { v: "200", l: "MCQs" },
                { v: "180", l: "MINUTES" },
                { v: "~54s", l: "PER Q" },
                { v: "0", l: "NEG. MARK" },
              ].map((s) => (
                <div key={s.l} className="terminal-border bg-terminal-bg p-3 text-center">
                  <p className="font-display text-2xl text-crt-green">{s.v}</p>
                  <p className="font-mono text-[10px] tracking-widest text-static-grey">{s.l}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-8 text-center">
        <p className="font-mono text-[11px] tracking-widest text-static-grey">
          BUILT SO HE NEVER LOSES THE SAME MARK TWICE
        </p>
      </footer>
    </div>
  );
}
