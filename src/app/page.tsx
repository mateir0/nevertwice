import Link from "next/link";
import { Activity, Cpu, Crosshair, Timer, Wrench, Zap } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { TraceDivider } from "@/components/TraceDivider";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";

const STEPS = [
  {
    n: "01",
    title: "TAKE A SESSION",
    body: "20 questions. 18 minutes. Paced like the real NET — one question at a time, no skipping the hard ones.",
    icon: Zap,
    trace: "TRACE 01 // SESSION START",
  },
  {
    n: "02",
    title: "CLASSIFY EVERY MISTAKE",
    body: "Wrong? Say why: concept gap, misread, calculation slip, time pressure. The label is the learning.",
    icon: Crosshair,
    trace: "TRACE 02 // FAULT CLASS",
  },
  {
    n: "03",
    title: "GET DRILLS FROM YOUR GRAPH",
    body: "Every classified error feeds your weakness graph. Next sessions target exactly where you bleed marks.",
    icon: Activity,
    trace: "TRACE 03 // AUTO-REROUTE",
  },
];

const NET_STATS = [
  { v: "200", l: "MCQs" },
  { v: "180", l: "MINUTES" },
  { v: "~54s", l: "PER QUESTION" },
  { v: "ZERO", l: "NEGATIVE MARKING" },
];

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
      {/* Top strip */}
      <header className="copper-border reveal mb-6 flex items-center justify-between gap-3 bg-pcb-deep px-4 py-2.5">
        <span className="font-display text-lg font-bold tracking-wide text-cream">NEVERTWICE</span>
        <div className="flex items-center gap-3">
          <span className="label hidden sm:inline">
            NUST ENTRY TEST • RE-PREPARATION MODE
          </span>
          <Link
            href="/app"
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            OPEN APP →
          </Link>
        </div>
      </header>

      <main className="space-y-6">
        {/* HERO */}
        <section aria-label="Intro" className="card reveal">
          <div className="grid gap-6 md:grid-cols-[1.25fr_1fr] md:items-center">
            <div>
              <Wordmark align="left" size="clamp(2.75rem, 6vw, 4.5rem)" />
              <p className="label mt-3">
                NUST ENTRY TEST • RE-PREPARATION MODE
              </p>
              <p className="mt-4 max-w-[52ch] font-mono text-[15px] leading-relaxed text-cream">
                My brother missed NUST. I built him the thing that makes sure he never loses the same mark twice.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link href="/app" className="btn-primary flex flex-1 items-center justify-center gap-2 text-center text-xl">
                  <Zap className="h-5 w-5" aria-hidden="true" />
                  BEGIN
                </Link>
                <Link href="/app" className="btn-secondary flex flex-1 items-center justify-center gap-2 text-center text-xl">
                  <Cpu className="h-5 w-5" aria-hidden="true" />
                  LAUNCH APP
                </Link>
              </div>
              <p className="mt-3 font-mono text-xs text-cream-dim">
                NEXT DRILL // 20 QUESTIONS • 18 MINUTES • PACED
              </p>
            </div>
            {/* Schematic side panel */}
            <div className="copper-border bg-pcb-panel p-4 font-mono text-[13px] leading-relaxed">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display flex items-center gap-2 text-sm font-bold tracking-wide text-accent">
                  <Cpu className="h-4 w-4" aria-hidden="true" />
                  SCHEMATIC // REV A
                </span>
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border border-copper" />
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-copper" />
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold" />
                </span>
              </div>
              <p className="text-cream">VCC RAIL: <span className="text-accent">NOMINAL</span></p>
              <p className="text-cream">WEAKNESS BUS: <span className="text-gold">ROUTING</span></p>
              <p className="text-cream-dim">LAST FAULT: Quadratic Equations — misread (+1)</p>
              <p className="text-cream-dim">DRILL QUEUED: 12 reps • Kinematics × Calculus</p>
              <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
                {["QA", "KN", "EL", "GR", "F2", "R1", "OK", "F1"].map((c, i) => (
                  <div
                    key={i}
                    className="copper-border flex h-11 items-center justify-center font-display text-base font-bold"
                    style={{
                      color: i % 3 === 0 ? "#FFD700" : "#EAD0AC",
                      backgroundColor: i % 3 === 0 ? "rgba(255,215,0,0.08)" : "rgba(22,91,69,0.35)",
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
              <p className="mt-3 border-t border-copper pt-2 text-[12px] text-cream-dim">
                Top 3 leaking nets get re-routed on repeat until the board tests green.
              </p>
            </div>
          </div>
        </section>

        <TraceDivider />

        {/* HOW IT WORKS */}
        <section aria-label="How it works" className="card reveal" style={{ animationDelay: "80ms" }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display flex items-center gap-2 text-2xl font-bold tracking-wide text-cream">
              <Wrench className="h-6 w-6 text-copper" aria-hidden="true" />
              HOW IT WORKS
            </h2>
            <span className="label hidden sm:inline">
              3 STEPS • NO ACCOUNTS • NO FLUFF
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="copper-border bg-pcb-panel p-4 odd:md:translate-y-0 even:md:translate-y-3"
              >
                <p className="flex items-center justify-between">
                  <span className="font-display text-3xl font-bold text-accent">{s.n}</span>
                  <s.icon className="h-6 w-6 text-copper" aria-hidden="true" />
                </p>
                <p className="font-display mt-1 text-xl font-bold tracking-wide text-cream">{s.title}</p>
                <p className="mt-2 font-mono text-[13px] leading-relaxed text-cream-dim">{s.body}</p>
                <p className="mt-3 font-mono text-[11px] text-accent">{s.trace}</p>
              </div>
            ))}
          </div>
        </section>

        <TraceDivider />

        {/* HEATMAP PREVIEW */}
        <section aria-label="Weakness graph preview" className="reveal" style={{ animationDelay: "160ms" }}>
          <WeaknessHeatmap
            nodes={[]}
            title="WEAKNESS HEATMAP — PREVIEW"
            emptyAction={{ href: "/app", label: "OPEN APP" }}
          />
          <p className="label mt-2 text-center">
            PREVIEW SHOWS THE UNPOPULATED BOARD • YOUR LIVE CIRCUIT LIVES IN THE APP
          </p>
        </section>

        <TraceDivider />

        {/* NET FORMAT STRIP */}
        <section aria-label="NET format" className="card reveal" style={{ animationDelay: "240ms" }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display flex items-center gap-2 text-2xl font-bold tracking-wide text-cream">
              <Timer className="h-6 w-6 text-copper" aria-hidden="true" />
              NET FORMAT // KNOW THE ARENA
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {NET_STATS.map((s) => (
              <div key={s.l} className="copper-border bg-pcb-panel p-4 text-center">
                <p className="font-display text-4xl font-bold text-gold">{s.v}</p>
                <p className="label mt-1">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[13px] leading-relaxed text-cream-dim">
            200 MCQs in 180 minutes means ~54 seconds per question with no negative marking — speed and accuracy both
            count, and every repeated mistake is a free mark thrown away. That&apos;s exactly what the graph kills.
          </p>
          <Link href="/app" className="btn-primary mt-4 block text-center text-xl">
            BEGIN → ENTER THE APP
          </Link>
        </section>
      </main>

      <footer className="copper-border reveal mt-6 bg-pcb-deep px-4 py-4 text-center">
        <p className="font-display text-xl font-bold tracking-wide text-cream">BUILT SO HE NEVER LOSES THE SAME MARK TWICE</p>
        <p className="label mt-1">
          NEVERTWICE • NUST NET RE-PREPARATION • <Link href="/app" className="underline hover:text-accent">OPEN APP</Link>
        </p>
      </footer>
    </div>
  );
}
