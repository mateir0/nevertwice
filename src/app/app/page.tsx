"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crosshair, Timer, Zap } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";
import { RecentSessions } from "@/components/RecentSessions";
import { BankCoverage } from "@/components/BankCoverage";
import { DossierCustody } from "@/components/DossierCustody";
import { OfflineBadge } from "@/components/OfflineBadge";
import { useSessions, useWeaknessNodes } from "@/hooks/useExam";
import { planDrill, planToGenTargets, saveActiveDrill, type DrillPlan } from "@/engine/drill-planner";
import { buildDrillQuestions } from "@/engine/question-generator";
import type { Question } from "@/types";

export default function AppDashboard() {
  const router = useRouter();
  const nodes = useWeaknessNodes();
  const { sessions } = useSessions();
  const [plan, setPlan] = useState<DrillPlan | null>(null);
  const [drillQuestions, setDrillQuestions] = useState<Question[] | null>(null);
  const [generating, setGenerating] = useState(false);

  // Scoring is sync and instant: compute the plan on mount / sessions change.
  useEffect(() => {
    setPlan(planDrill());
  }, [sessions]);

  // Question text is async end-to-end (Groq → fallback → shuffle) through
  // the single buildDrillQuestions pipeline — the same one /results uses.
  // The fallback delivers instantly when Groq fails or is unconfigured.
  useEffect(() => {
    if (!plan) {
      setDrillQuestions(null);
      setGenerating(false);
      return;
    }
    let cancelled = false;
    setGenerating(true);
    setDrillQuestions(null);
    buildDrillQuestions(planToGenTargets(plan)).then((qs) => {
      if (cancelled) return;
      setDrillQuestions(qs);
      setGenerating(false);
    });
    return () => {
      cancelled = true;
    };
  }, [plan]);

  function beginDrill(): void {
    if (!plan || !drillQuestions || drillQuestions.length === 0) return;
    saveActiveDrill({ ...plan, questions: drillQuestions });
    router.push("/session");
  }

  const plannedTotal = plan ? plan.targets.reduce((n, t) => n + t.count, 0) : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
      <header className="bronze-frame reveal mb-6 flex items-center justify-between gap-3 bg-panel px-4 py-2.5">
        <Link href="/" className="font-display text-xl tracking-wide text-blood">
          ← NEVERTWICE
        </Link>
        <span className="flex items-center gap-2">
          <OfflineBadge />
          <span className="label">
            APP // SESSION CONSOLE
          </span>
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
          {plan ? (
            <section aria-label="Next drill" className="card reveal" style={{ animationDelay: "90ms" }}>
              <p className="label">
                YOUR NEXT DRILL
              </p>
              <p className="font-display mt-1 text-2xl tracking-wide text-parchment">
                {plannedTotal} QUESTIONS • TARGETED • PACED
              </p>
              <p className="mt-1 font-display text-[17px] text-parchment/80">
                {plan.reason}
              </p>
              <p className="mt-2 font-type text-xs tracking-widest text-faded">
                {plan.targets.map((t) => t.subtopic.toUpperCase()).join(" · ")}
              </p>
              <button
                onClick={beginDrill}
                disabled={generating || !drillQuestions}
                className="btn-primary mt-4 flex w-full items-center justify-center gap-2 text-center text-lg disabled:cursor-wait disabled:opacity-50"
              >
                <Crosshair className="h-5 w-5" aria-hidden="true" />
                {generating || !drillQuestions ? "GENERATING DRILL…" : "BEGIN DRILL"}
              </button>
            </section>
          ) : (
            <section aria-label="Next step" className="card reveal" style={{ animationDelay: "90ms" }}>
              <p className="label">
                YOUR NEXT 15 MINUTES
              </p>
              <p className="font-display mt-1 text-2xl tracking-wide text-parchment">
                20 QUESTIONS • 18 MINUTES • PACED
              </p>
              <p className="mt-1 font-display text-[17px] text-parchment/80">
                One question at a time. Wrong answers get classified so the heatmap learns.
              </p>
              <Link href="/session" className="btn-primary mt-4 flex items-center justify-center gap-2 text-center text-lg">
                <Zap className="h-5 w-5" aria-hidden="true" />
                BEGIN
              </Link>
            </section>
          )}

          <WeaknessHeatmap
            nodes={nodes}
            title="WEAKNESS HEATMAP"
            emptyAction={{ href: "/session", label: "BEGIN" }}
          />
        </div>

        <div className="space-y-5">
          <RecentSessions sessions={sessions} />
          <section aria-label="NET format reminder" className="card">
            <h2 className="font-display flex items-center gap-2 text-2xl tracking-wide text-parchment">
              <Timer className="h-5 w-5 text-bronze" aria-hidden="true" />
              NET FORMAT
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { v: "200", l: "MCQs" },
                { v: "180", l: "MINUTES" },
                { v: "~54s", l: "PER Q" },
                { v: "0", l: "NEG. MARK" },
              ].map((s) => (
                <div key={s.l} className="bronze-frame bg-night p-3 text-center">
                  <p className="font-type text-2xl font-bold text-blood">{s.v}</p>
                  <p className="mt-1 font-type text-[10px] tracking-[0.08em] text-faded">{s.l}</p>
                </div>
              ))}
            </div>
          </section>
          <BankCoverage />
          <DossierCustody />
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
