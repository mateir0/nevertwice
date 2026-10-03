"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crosshair, Zap } from "lucide-react";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";
import { RecentSessions } from "@/components/RecentSessions";
import { Trajectory } from "@/components/Trajectory";
import { DossierAdmin } from "@/components/DossierAdmin";
import { OfflineBadge } from "@/components/OfflineBadge";
import { useSessions, useWeaknessNodes } from "@/hooks/useExam";
import { planDrill, planToGenTargets, saveActiveDrill, type DrillPlan } from "@/engine/drill-planner";
import { buildDrillQuestions, buildMockQuestions, MOCK_QUOTA_SPENT_LINE } from "@/engine/question-generator";
import type { Question } from "@/types";

type AppTab = "drill" | "threats" | "progress" | "files";

const TABS: { id: AppTab; label: string; panel: string }[] = [
  { id: "drill", label: "DRILL", panel: "panel-drill" },
  { id: "threats", label: "THREATS", panel: "panel-threats" },
  { id: "progress", label: "PROGRESS", panel: "panel-progress" },
  { id: "files", label: "FILES", panel: "panel-files" },
];

export default function AppDashboard() {
  const router = useRouter();
  const nodes = useWeaknessNodes();
  const { sessions } = useSessions();
  const [plan, setPlan] = useState<DrillPlan | null>(null);
  const [drillQuestions, setDrillQuestions] = useState<Question[] | null>(null);
  const [generating, setGenerating] = useState(false);
  // Full mock builds on demand (button tap): ~7 SEQUENTIAL Groq batches
  // with ~8s stagger take ~1 minute, bank cycling when offline. No mount
  // effect — never burn quota on a plain /app visit.
  const [mockGenerating, setMockGenerating] = useState(false);
  const [mockQuotaSpent, setMockQuotaSpent] = useState(false);
  // Direction A: one decisive action per screen. DRILL first, always.
  const [tab, setTab] = useState<AppTab>("drill");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const paneRefs = useRef<Record<AppTab, HTMLElement | null>>({
    drill: null,
    threats: null,
    progress: null,
    files: null,
  });

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

  // Panes stay mounted (hidden attribute, never unmounted) so drill/mock
  // generation state survives tab switches. The active pane gets one
  // subtle compositor-only fade per switch — no remount, no state loss.
  useEffect(() => {
    const el = paneRefs.current[tab];
    if (!el || typeof el.animate !== "function") return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
  }, [tab]);

  function beginDrill(): void {
    if (!plan || !drillQuestions || drillQuestions.length === 0) return;
    saveActiveDrill({ ...plan, questions: drillQuestions });
    router.push("/session");
  }

  function beginMock(): void {
    if (mockGenerating) return;
    setMockGenerating(true);
    setMockQuotaSpent(false);
    buildMockQuestions().then(
      (qs) => {
        if (!qs || qs.length === 0) {
          setMockGenerating(false);
          return;
        }
        const now = Date.now();
        saveActiveDrill({
          id: `mock-${now}`,
          createdAt: now,
          targets: [],
          reason: "FULL MOCK — NET FORMAT",
          questions: qs,
          kind: "mock",
        });
        router.push("/session?mode=mock");
      },
      (err) => {
        // Daily print quota spent: honest dossier line, drills unaffected.
        if (err instanceof Error && err.message.includes("mock-quota-spent")) {
          setMockQuotaSpent(true);
        }
        setMockGenerating(false);
      },
    );
  }

  function onTabKeyDown(e: KeyboardEvent): void {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const ids = TABS.map((t) => t.id);
    const i = ids.indexOf(tab);
    const next =
      e.key === "ArrowRight" ? ids[(i + 1) % ids.length] : ids[(i - 1 + ids.length) % ids.length];
    setTab(next);
    tabRefs.current[ids.indexOf(next)]?.focus();
  }

  return (
      <div className="mx-auto w-full max-w-xl px-4 py-6">
      <header className="bronze-frame reveal mb-4 flex items-center justify-between gap-3 bg-panel px-4 py-2.5">
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

      <div
        role="tablist"
        aria-label="App sections"
        onKeyDown={onTabKeyDown}
        className="sticky top-0 z-40 -mx-4 border-b border-bronze bg-night px-4"
      >
        <div className="flex">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={t.panel}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`min-w-0 flex-1 whitespace-nowrap px-1 py-3 text-center font-type text-[13px] tracking-[0.14em] transition-colors ${
                tab === t.id ? "text-parchment" : "text-faded"
              }`}
              style={tab === t.id ? { borderBottom: "2px solid #B3202C" } : { borderBottom: "2px solid transparent" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="pt-5">
        <div
          role="tabpanel"
          id="panel-drill"
          aria-labelledby="tab-drill"
          hidden={tab !== "drill"}
          ref={(el) => {
            paneRefs.current.drill = el;
          }}
          className="space-y-5"
        >
          {plan ? (
            <section aria-label="Next drill" className="card reveal" style={{ animationDelay: "60ms" }}>
              <p className="label">
                YOUR NEXT DRILL
              </p>
              <p className="font-display mt-2 text-[17px] leading-snug text-parchment/90">
                {plan.reason}
              </p>
              <p className="mt-1 font-type text-[11px] tracking-widest text-faded">
                {plan.targets.map((t) => t.subtopic.toUpperCase()).join(" · ")}
              </p>
              <button
                onClick={beginDrill}
                disabled={generating || !drillQuestions}
                className="btn-primary mt-3 flex w-full items-center justify-center gap-2 px-5 py-2.5 text-center text-base disabled:cursor-wait disabled:opacity-50"
              >
                <Crosshair className="h-5 w-5" aria-hidden="true" />
                {generating || !drillQuestions ? "GENERATING DRILL…" : "BEGIN DRILL"}
              </button>
            </section>
          ) : (
            <section aria-label="Next step" className="card reveal" style={{ animationDelay: "60ms" }}>
              <p className="label">
                YOUR NEXT 15 MINUTES
              </p>
              <p className="font-display mt-2 text-lg leading-snug text-parchment">
                20 QUESTIONS • 18 MINUTES • PACED
              </p>
              <p className="mt-1 font-display text-[15px] text-parchment/80">
                One question at a time. Wrong answers get classified so the heatmap learns.
              </p>
              <Link href="/session" className="btn-primary mt-3 flex items-center justify-center gap-2 px-5 py-2.5 text-center text-base">
                <Zap className="h-5 w-5" aria-hidden="true" />
                BEGIN
              </Link>
            </section>
          )}

          <section aria-label="Full mock" className="card reveal px-4 py-2.5" style={{ animationDelay: "90ms" }}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="label">
                  FULL MOCK — NET FORMAT
                </p>
                <p className="mt-0.5 font-type text-xs tracking-widest text-parchment">
                  200Q · 180 MIN · NET WEIGHTING
                </p>
                <p className="mt-0.5 font-type text-[10px] leading-snug text-faded">
                  Full NET-format simulation — verified bank + generated. NUST doesn&apos;t release official past papers.
                </p>
                {mockQuotaSpent && (
                  <p className="mt-1 font-type text-[10px] leading-snug tracking-widest text-blood" role="status">
                    {MOCK_QUOTA_SPENT_LINE}
                  </p>
                )}
              </div>
              <button
                onClick={beginMock}
                disabled={mockGenerating}
                className="btn-primary shrink-0 px-4 py-2 text-xs disabled:cursor-wait disabled:opacity-50"
              >
                {mockGenerating ? "PRINTING YOUR PAPER… (~1 MINUTE)" : "BEGIN MOCK"}
              </button>
            </div>
          </section>
        </div>

        <div
          role="tabpanel"
          id="panel-threats"
          aria-labelledby="tab-threats"
          hidden={tab !== "threats"}
          ref={(el) => {
            paneRefs.current.threats = el;
          }}
          className="space-y-5"
        >
          <WeaknessHeatmap
            nodes={nodes}
            title="WEAKNESS HEATMAP"
            emptyAction={{ href: "/session", label: "BEGIN" }}
          />
        </div>

        <div
          role="tabpanel"
          id="panel-progress"
          aria-labelledby="tab-progress"
          hidden={tab !== "progress"}
          ref={(el) => {
            paneRefs.current.progress = el;
          }}
          className="space-y-5"
        >
          <Trajectory sessions={sessions} />
          <RecentSessions sessions={sessions} />
        </div>

        <div
          role="tabpanel"
          id="panel-files"
          aria-labelledby="tab-files"
          hidden={tab !== "files"}
          ref={(el) => {
            paneRefs.current.files = el;
          }}
          className="space-y-5"
        >
          <DossierAdmin />
          <section aria-label="NET format reference" className="bronze-frame flex items-stretch justify-between gap-1 bg-night px-2 py-2">
            {[
              { v: "200", l: "MCQs" },
              { v: "180", l: "MINUTES" },
              { v: "~54s", l: "PER Q" },
              { v: "0", l: "NEG. MARK" },
            ].map((s) => (
              <div key={s.l} className="flex-1 text-center">
                <p className="font-type text-lg font-bold leading-none text-blood">{s.v}</p>
                <p className="mt-1 font-type text-[9px] tracking-[0.08em] text-faded">{s.l}</p>
              </div>
            ))}
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
