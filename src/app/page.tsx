import Link from "next/link";
import { CircuitBoard, Cpu, Crosshair, Target, Zap } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { TraceDivider } from "@/components/TraceDivider";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";

const LEDGER = [
  { v: "200", l: "MCQs" },
  { v: "180", l: "MINUTES" },
  { v: "~54s", l: "PER QUESTION" },
];

const STEPS = [
  {
    n: "01",
    title: "Take a session",
    body: "One question at a time, paced at ~54 seconds.",
    icon: Zap,
  },
  {
    n: "02",
    title: "Classify every mistake",
    body: "Concept-gap, misread, time-pressure, silly-mistake, formula-error.",
    icon: Crosshair,
  },
  {
    n: "03",
    title: "Watch the weakness graph",
    body: "Every miss routed onto your circuit.",
    icon: CircuitBoard,
  },
  {
    n: "04",
    title: "Drill what leaks",
    body: "Targeted reps until the board tests green.",
    icon: Target,
  },
];

export default function LandingPage() {
  const activeNets = 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-6 md:px-8">
      {/* STICKY HEADER */}
      <header className="sticky top-0 z-[100] -mx-4 border-b border-copper bg-pcb px-4 py-2.5 md:-mx-8 md:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
          <Link href="/" className="font-display text-lg font-bold tracking-wide text-cream">
            NEVERTWICE
          </Link>
          <nav aria-label="Sections" className="flex items-center gap-3 font-mono text-[13px] text-cream-dim">
            <Link href="#board" className="transition-colors duration-200 hover:text-accent">
              Board
            </Link>
            <span aria-hidden="true" className="text-copper">/</span>
            <Link href="#how" className="transition-colors duration-200 hover:text-accent">
              How it works
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="label hidden sm:inline">RE-PREP MODE</span>
            <Link href="/app" className="btn-primary px-4 py-1.5 text-sm">
              BEGIN
            </Link>
          </div>
        </div>
      </header>

      <main className="space-y-6 pt-6">
        {/* SECTION 1 — HERO, centered single column */}
        <section aria-label="Briefing" className="card reveal px-4 py-10 text-center sm:px-8">
          <p className="label text-accent">RE-PREPARATION PROTOCOL</p>
          <div aria-hidden="true" className="mx-auto mt-2 h-px w-24 bg-copper" />
          <div className="mt-4 flex justify-center">
            <Wordmark align="center" size="clamp(3rem, 8vw, 5.5rem)" />
          </div>
          <p className="mx-auto mt-5 max-w-[52ch] font-mono text-[15px] leading-relaxed text-cream">
            My brother missed NUST. I built him the thing that makes sure he never loses the same mark twice.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/app" className="btn-primary flex items-center justify-center gap-2 text-xl sm:min-w-[220px]">
              <Zap className="h-5 w-5" aria-hidden="true" />
              BEGIN
            </Link>
            <Link href="/app" className="font-mono text-sm text-cream-dim underline transition-colors duration-200 hover:text-accent">
              Open app →
            </Link>
          </div>
          <p className="mt-3">
            <Link href="#how" className="font-mono text-xs text-cream-dim underline transition-colors duration-200 hover:text-accent">
              How it works
            </Link>
          </p>

          <p className="label mt-10 text-accent">MISSION LEDGER</p>
          <div aria-hidden="true" className="mx-auto mt-2 h-px w-24 bg-copper" />
          <dl className="mx-auto mt-4 grid max-w-2xl grid-cols-3 gap-2" aria-label="NET format ledger">
            {LEDGER.map((s) => (
              <div key={s.l} className="copper-border bg-pcb-panel px-2 py-3 text-center">
                <dt className="sr-only">{s.l}</dt>
                <dd className="font-display text-2xl font-bold text-gold sm:text-3xl">{s.v}</dd>
                <dd className="label mt-0.5 text-[10px]">{s.l}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4">
            <Link href="#board" className="font-mono text-sm text-cream-dim underline transition-colors duration-200 hover:text-accent">
              View the board
            </Link>
          </p>
        </section>

        <TraceDivider />

        {/* SECTION 2 — FOUR-STEP BAND */}
        <section id="how" aria-label="How a comeback runs" className="card reveal scroll-mt-24" style={{ animationDelay: "80ms" }}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold tracking-wide text-cream">
              HOW A COMEBACK RUNS
            </h2>
            <span className="label">4 STEPS • NO ACCOUNTS • NO FLUFF</span>
          </div>
          <ol className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:items-stretch">
            {STEPS.map((s, i) => (
              <li key={s.n} className="contents">
                <div className="copper-border flex-1 bg-pcb-panel p-4">
                  <p className="flex items-center justify-between">
                    <span className="font-display text-3xl font-bold text-accent">{s.n}</span>
                    <s.icon className="h-6 w-6 text-copper" aria-hidden="true" />
                  </p>
                  <p className="font-display mt-1 text-xl font-bold tracking-wide text-cream">{s.title}</p>
                  <p className="mt-2 font-mono text-[13px] leading-relaxed text-cream-dim">{s.body}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <span aria-hidden="true" className="hidden shrink-0 items-center font-display text-2xl font-bold text-copper lg:flex">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        <TraceDivider />

        {/* SECTION 3 — BOARD */}
        <section id="board" aria-label="The board" className="reveal scroll-mt-24" style={{ animationDelay: "160ms" }}>
          <p className="label text-center text-accent">WELCOME TO NEVERTWICE</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-wide text-cream">The Board</h2>
              <p className="mt-1 font-mono text-sm text-cream-dim">
                You have one mission. Make every mark count.
              </p>
            </div>
            <div className="copper-border flex items-center gap-2 bg-pcb-deep px-3 py-2" aria-label={`${activeNets} active nets`}>
              <span className="font-display rounded bg-copper px-2 py-0.5 text-xl font-bold text-pcb-deep">
                {activeNets}
              </span>
              <span className="label">ACTIVE NETS</span>
            </div>
          </div>

          {/* Relocated schematic status strip */}
          <div className="copper-border mt-4 flex flex-col gap-2 bg-pcb-panel p-3 font-mono text-[13px] leading-relaxed sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6" aria-label="Board status">
            <p className="flex items-center gap-2 text-cream">
              <Cpu className="h-4 w-4 text-copper" aria-hidden="true" />
              WEAKNESS BUS: <span className="text-gold">ROUTING</span>
            </p>
            <p className="text-cream-dim">LAST FAULT: Quadratic Equations — misread (+1)</p>
            <p className="text-cream-dim">DRILL QUEUED: 12 reps • Kinematics × Calculus</p>
          </div>

          <div className="mt-4">
            <WeaknessHeatmap
              nodes={[]}
              title="THE BOARD — LIVE CIRCUIT"
              emptyAction={{ href: "/app", label: "BEGIN" }}
            />
          </div>
        </section>

        <TraceDivider />

        {/* SECTION 4 — FOOTER */}
        <footer className="reveal px-4 py-8 text-center" style={{ animationDelay: "240ms" }}>
          <div aria-hidden="true" className="mx-auto mb-6 h-px w-full bg-copper/40" />
          {/* Ornamental circuit-trace divider with chip medallion */}
          <div aria-hidden="true" className="mx-auto flex max-w-md items-center gap-2">
            <span className="trace-divider-line flex-1" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-md border-[1.5px] border-copper bg-pcb-deep">
              <span className="absolute -left-[5px] top-[20%] h-[3px] w-[5px] bg-copper" />
              <span className="absolute -left-[5px] top-[48%] h-[3px] w-[5px] bg-copper" />
              <span className="absolute -left-[5px] top-[76%] h-[3px] w-[5px] bg-copper" />
              <span className="absolute -right-[5px] top-[20%] h-[3px] w-[5px] bg-copper" />
              <span className="absolute -right-[5px] top-[48%] h-[3px] w-[5px] bg-copper" />
              <span className="absolute -right-[5px] top-[76%] h-[3px] w-[5px] bg-copper" />
              <span className="font-display text-xl font-bold text-gold">N</span>
            </span>
            <span className="trace-divider-line flex-1" />
          </div>
          <div className="mt-6">
            <Wordmark align="center" size="clamp(2rem, 5vw, 3rem)" />
          </div>
          <p className="mt-4 font-mono text-sm text-cream-dim">
            Built so he never loses the same mark twice.
          </p>
          <p className="mt-6 text-right font-mono text-xs text-cream-dim">
            A Hashir original.
          </p>
        </footer>
      </main>
    </div>
  );
}
