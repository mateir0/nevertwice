"use client";

import Link from "next/link";
import { Timer, Zap } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";
import { RecentSessions } from "@/components/RecentSessions";
import { useSessions, useWeaknessNodes } from "@/hooks/useExam";

export default function AppDashboard() {
  const nodes = useWeaknessNodes();
  const { sessions } = useSessions();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
      <header className="copper-border reveal mb-6 flex items-center justify-between gap-3 bg-pcb-deep px-4 py-2.5">
        <Link href="/" className="font-display text-lg font-bold tracking-wide text-cream">
          ← NEVERTWICE
        </Link>
        <span className="label">
          APP // SESSION CONSOLE
        </span>
      </header>

      <div className="reveal mb-6">
        <Wordmark align="center" size="clamp(2.5rem, 5vw, 3.5rem)" />
        <p className="label mt-3 text-center">
          NUST ENTRY TEST • RE-PREPARATION MODE
        </p>
      </div>

      <main className="grid gap-5 md:grid-cols-[1.2fr_1fr] md:items-start">
        <div className="space-y-5">
          <section aria-label="Next step" className="card reveal" style={{ animationDelay: "80ms" }}>
            <p className="label">
              YOUR NEXT 15 MINUTES
            </p>
            <p className="font-display mt-1 text-2xl font-bold tracking-wide text-cream">
              20 QUESTIONS • 18 MINUTES • PACED
            </p>
            <p className="mt-1 font-mono text-sm text-cream-dim">
              One question at a time. Wrong answers get classified so the heatmap learns.
            </p>
            <Link href="/session" className="btn-primary mt-4 flex items-center justify-center gap-2 text-center text-lg">
              <Zap className="h-5 w-5" aria-hidden="true" />
              BEGIN
            </Link>
          </section>

          <WeaknessHeatmap
            nodes={nodes}
            title="WEAKNESS HEATMAP"
            emptyAction={{ href: "/session", label: "BEGIN" }}
          />
        </div>

        <div className="space-y-5">
          <RecentSessions sessions={sessions} />
          <section aria-label="NET format reminder" className="card">
            <h2 className="font-display flex items-center gap-2 text-xl font-bold tracking-wide text-cream">
              <Timer className="h-5 w-5 text-copper" aria-hidden="true" />
              NET FORMAT
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { v: "200", l: "MCQs" },
                { v: "180", l: "MINUTES" },
                { v: "~54s", l: "PER Q" },
                { v: "0", l: "NEG. MARK" },
              ].map((s) => (
                <div key={s.l} className="copper-border bg-pcb-panel p-3 text-center">
                  <p className="font-display text-2xl font-bold text-gold">{s.v}</p>
                  <p className="label mt-1 text-[10px]">{s.l}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-8 text-center">
        <p className="label">
          BUILT SO HE NEVER LOSES THE SAME MARK TWICE
        </p>
      </footer>
    </div>
  );
}
