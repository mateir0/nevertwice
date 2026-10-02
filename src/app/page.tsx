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
      <header className="sticky top-0 z-[100] -mx-4 border-b border-copper bg-parchment px-4 py-2.5 md:-mx-8 md:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4">
          <Link href="/" className="font-display text-lg font-bold tracking-wide text-ink">
            NEVERTWICE
          </Link>
          <nav aria-label="Sections" className="flex items-center gap-3 font-mono text-[13px] text-ink/70">
            <Link href="#board" className="transition-colors duration-200 hover:text-copper">
              Board
            </Link>
            <span aria-hidden="true" className="text-copper">/</span>
            <Link href="#how" className="transition-colors duration-200 hover:text-copper">
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
        {/* SECTION 1 — HERO, open cream background, split two-column */}
        <section aria-label="Briefing" className="reveal px-1 py-10 sm:px-2">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            {/* LEFT — badge, headline, story, buttons */}
            <div>
              <p>
                <span className="label inline-block rounded-full border border-copper px-3 py-1">
                  RE-PREPARATION PROTOCOL
                </span>
              </p>
              <h1
                className="font-display mt-4 font-bold"
                style={{ fontSize: "clamp(3.5rem, 8vw, 6.5rem)", lineHeight: 0.95 }}
              >
                <span className="text-ink">NEVER</span><span className="text-copper">TWICE</span>
              </h1>
              <p className="mt-5 max-w-[52ch] border-l-2 border-copper pl-4 font-mono text-[15px] leading-relaxed text-ink">
                My brother missed NUST. I built him the thing that makes sure he never loses the same mark twice.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link href="/app" className="btn-primary flex items-center justify-center gap-2 text-xl sm:min-w-[200px]">
                  <Zap className="h-5 w-5" aria-hidden="true" />
                  BEGIN
                </Link>
                <Link href="/app" className="btn-secondary flex items-center justify-center gap-2 text-xl sm:min-w-[200px]">
                  Open app →
                </Link>
                <Link href="#how" className="font-mono text-sm text-ink/70 underline transition-colors duration-200 hover:text-copper sm:ml-1">
                  How it works
                </Link>
              </div>
            </div>
            {/* RIGHT — one tilted ledger card, lifting off the page */}
            <div
              className="card lg:rotate-2"
              style={{ boxShadow: "0 12px 32px rgba(58,46,34,0.16)" }}
            >
              <p className="label">MISSION LEDGER</p>
              <dl className="mt-3 space-y-2" aria-label="NET format ledger">
                {LEDGER.map((s) => (
                  <div key={s.l} className="copper-border flex items-baseline justify-between gap-3 bg-parchment px-4 py-3">
                    <dt className="sr-only">{s.l}</dt>
                    <dd className="font-display text-4xl font-bold text-gold">{s.v}</dd>
                    <dd className="label text-ink">{s.l}</dd>
                  </div>
                ))}
              </dl>
              <Link href="#board" className="mt-4 block rounded-lg border-[1.5px] border-ink bg-ink px-6 py-3 text-center font-display font-bold uppercase tracking-wider text-vellum transition-all duration-200 hover:bg-copper hover:border-copper active:translate-y-px">
                View the board →
              </Link>
            </div>
          </div>
        </section>

        <TraceDivider />

        {/* SECTION 2 — FOUR-STEP BAND */}
        <section id="how" aria-label="How a comeback runs" className="card reveal scroll-mt-24" style={{ animationDelay: "80ms" }}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold tracking-wide text-ink">
              HOW A COMEBACK RUNS
            </h2>
            <span className="label">4 STEPS • NO ACCOUNTS • NO FLUFF</span>
          </div>
          <ol className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:items-stretch">
            {STEPS.map((s, i) => (
              <li key={s.n} className="contents">
                <div className="copper-border flex-1 bg-parchment p-4">
                  <p className="flex items-center justify-between">
                    <span className="font-display text-3xl font-bold text-copper">{s.n}</span>
                    <s.icon className="h-6 w-6 text-copper" aria-hidden="true" />
                  </p>
                  <p className="font-display mt-1 text-xl font-bold tracking-wide text-ink">{s.title}</p>
                  <p className="mt-2 font-mono text-[13px] leading-relaxed text-ink/70">{s.body}</p>
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
          <p className="label text-center">WELCOME TO NEVERTWICE</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-wide text-ink">The Board</h2>
              <p className="mt-1 font-mono text-sm text-ink/70">
                You have one mission. Make every mark count.
              </p>
            </div>
            <div className="copper-border flex items-center gap-2 bg-vellum px-3 py-2" aria-label={`${activeNets} active nets`}>
              <span className="font-display rounded bg-ink px-2 py-0.5 text-xl font-bold text-vellum">
                {activeNets}
              </span>
              <span className="label">ACTIVE NETS</span>
            </div>
          </div>

          {/* Schematic status strip */}
          <div className="copper-border mt-4 flex flex-col gap-2 bg-vellum p-3 font-mono text-[13px] leading-relaxed sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6" aria-label="Board status">
            <p className="flex items-center gap-2 text-ink">
              <Cpu className="h-4 w-4 text-copper" aria-hidden="true" />
              WEAKNESS BUS: <span className="font-bold text-copper">ROUTING</span>
            </p>
            <p className="text-ink/70">LAST FAULT: Quadratic Equations — misread (+1)</p>
            <p className="text-ink/70">DRILL QUEUED: 12 reps • Kinematics × Calculus</p>
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
            <span className="relative flex h-12 w-12 items-center justify-center rounded-md border-[1.5px] border-copper bg-vellum">
              <span className="absolute -left-[5px] top-[20%] h-[3px] w-[5px] bg-copper" />
              <span className="absolute -left-[5px] top-[48%] h-[3px] w-[5px] bg-copper" />
              <span className="absolute -left-[5px] top-[76%] h-[3px] w-[5px] bg-copper" />
              <span className="absolute -right-[5px] top-[20%] h-[3px] w-[5px] bg-copper" />
              <span className="absolute -right-[5px] top-[48%] h-[3px] w-[5px] bg-copper" />
              <span className="absolute -right-[5px] top-[76%] h-[3px] w-[5px] bg-copper" />
              <span className="font-display text-xl font-bold text-copper">N</span>
            </span>
            <span className="trace-divider-line flex-1" />
          </div>
          <div className="mt-6">
            <Wordmark align="center" size="clamp(2rem, 5vw, 3rem)" />
          </div>
          <p className="mt-4 font-mono text-sm text-ink/70">
            Built so he never loses the same mark twice.
          </p>
          <p className="mt-6 text-right font-mono text-xs text-ink/70">
            A Hashir original.
          </p>
        </footer>
      </main>
    </div>
  );
}
