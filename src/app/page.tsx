import Link from "next/link";
import { CircuitBoard, Cpu, Crosshair, Target, Zap } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { TraceDivider } from "@/components/TraceDivider";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";

const LEDGER = [
  { v: "200", l: "MCQs" },
  { v: "180", l: "MINUTES" },
  { v: "~54s", l: "PER QUESTION" },
  { v: "ZERO", l: "NEGATIVE MARKING" },
];

const STEPS = [
  {
    n: "01",
    title: "TAKE A SESSION",
    body: "One question at a time, paced. 20 questions in 18 minutes — no skipping the hard ones.",
    icon: Zap,
    trace: "TRACE 01 // SESSION START",
  },
  {
    n: "02",
    title: "CLASSIFY EVERY MISTAKE",
    body: "Concept-gap, misread, time-pressure, silly-mistake, formula-error. Name the fault or it repeats.",
    icon: Crosshair,
    trace: "TRACE 02 // FAULT CLASS",
  },
  {
    n: "03",
    title: "WATCH THE WEAKNESS GRAPH",
    body: "Every miss gets routed onto your circuit. Hot nets glow gold, mastered ones test green.",
    icon: CircuitBoard,
    trace: "TRACE 03 // NET ROUTED",
  },
  {
    n: "04",
    title: "DRILL WHAT LEAKS",
    body: "Targeted reps on your weakest nets, on repeat, until the board tests green.",
    icon: Target,
    trace: "TRACE 04 // REROUTE LOOP",
  },
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
        {/* SECTION 1 — HERO */}
        <section aria-label="Briefing" className="card reveal">
          <div className="grid gap-6 md:grid-cols-[1.25fr_1fr] md:items-center">
            <div>
              <p className="label text-accent">
                RE-PREPARATION PROTOCOL // REV A
              </p>
              <div className="mt-2">
                <Wordmark align="left" size="clamp(2.75rem, 6vw, 4.5rem)" />
              </div>
              <p className="mt-4 max-w-[52ch] font-mono text-[15px] leading-relaxed text-cream">
                My brother missed NUST. I built him the thing that makes sure he never loses the same mark twice.
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="NET format ledger">
                {LEDGER.map((s) => (
                  <div key={s.l} className="copper-border bg-pcb-panel px-2 py-2.5 text-center">
                    <dt className="sr-only">{s.l}</dt>
                    <dd className="font-display text-2xl font-bold text-gold">{s.v}</dd>
                    <dd className="label mt-0.5 text-[10px]">{s.l}</dd>
                  </div>
                ))}
              </dl>
              <Link href="/app" className="btn-primary mt-5 flex items-center justify-center gap-2 text-center text-xl">
                <Zap className="h-5 w-5" aria-hidden="true" />
                BEGIN
              </Link>
            </div>
            {/* Schematic readout — the hero's compass */}
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

        {/* SECTION 2 — FOUR-STEP BAND */}
        <section aria-label="How a comeback runs" className="card reveal" style={{ animationDelay: "80ms" }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold tracking-wide text-cream">
              HOW A COMEBACK RUNS
            </h2>
            <span className="label">
              4 STEPS • NO ACCOUNTS • NO FLUFF
            </span>
          </div>
          <ol className="grid gap-3 md:grid-cols-2">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className={`copper-border relative bg-pcb-panel p-4 ${i % 2 === 1 ? "md:translate-y-3" : ""}`}
              >
                <p className="flex items-center justify-between">
                  <span className="font-display text-3xl font-bold text-accent">{s.n}</span>
                  <s.icon className="h-6 w-6 text-copper" aria-hidden="true" />
                </p>
                <p className="font-display mt-1 text-xl font-bold tracking-wide text-cream">{s.title}</p>
                <p className="mt-2 font-mono text-[13px] leading-relaxed text-cream-dim">{s.body}</p>
                <p className="mt-3 font-mono text-[11px] text-accent">{s.trace}</p>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-[15px] left-8 hidden h-[15px] w-[2px] bg-copper md:block"
                  />
                )}
              </li>
            ))}
          </ol>
        </section>

        <TraceDivider />

        {/* SECTION 3 — THE BOARD */}
        <section aria-label="The board" className="reveal" style={{ animationDelay: "160ms" }}>
          <div className="mb-4 text-center">
            <p className="font-display text-2xl font-bold tracking-wide text-cream">
              Welcome to NEVERTWICE
            </p>
            <p className="mt-1 font-mono text-sm text-cream-dim">
              You have one mission. Make every mark count.
            </p>
          </div>
          <WeaknessHeatmap
            nodes={[]}
            title="THE BOARD — LIVE CIRCUIT"
            emptyAction={{ href: "/app", label: "BEGIN" }}
          />
        </section>

        <TraceDivider />

        {/* SECTION 4 — FOOTER */}
        <footer className="card reveal px-4 py-8 text-center" style={{ animationDelay: "240ms" }}>
          <Wordmark align="center" size="clamp(2rem, 5vw, 3rem)" />
          <p className="font-display mt-4 text-xl font-bold tracking-wide text-cream">
            BUILT SO HE NEVER LOSES THE SAME MARK TWICE
          </p>
          <p className="label mt-2">
            NEVERTWICE • NUST NET RE-PREPARATION • <Link href="/app" className="underline hover:text-accent">OPEN APP</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
