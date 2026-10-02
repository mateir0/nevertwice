import Link from "next/link";
import { CircuitBoard, Cpu, Crosshair, Target, Zap } from "lucide-react";
import { SolidBackdrop } from "@/components/SolidBackdrop";
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
      <SolidBackdrop />
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
        {/* SECTION 1 — HERO, open background, split two-column */}
        <section aria-label="Briefing" className="reveal relative overflow-hidden px-1 py-10 sm:px-2">
          {/* Abstract PCB artwork — atmosphere only, never above the text */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1200 560"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
          >
            {/* Sweeping copper traces */}
            <g fill="none" stroke="#B87333" strokeWidth="3">
              <path d="M-20,90 H260 L340,170 H640 L720,250 H1020 L1100,330 H1240" opacity="0.16" />
              <path d="M-20,470 H200 L300,370 H560" opacity="0.14" />
              <path d="M700,580 L700,440 L820,320 H1060 L1140,240 V60" opacity="0.15" />
              <path d="M-20,250 H120 L190,320 H420" opacity="0.12" />
              <path d="M900,580 L900,500 L980,420 H1240" opacity="0.12" />
            </g>
            {/* Solder-pad vias on the trace ends */}
            <g fill="#B87333">
              <circle cx="260" cy="90" r="7" opacity="0.18" />
              <circle cx="720" cy="250" r="7" opacity="0.18" />
              <circle cx="1100" cy="330" r="7" opacity="0.18" />
              <circle cx="700" cy="440" r="7" opacity="0.16" />
              <circle cx="1140" cy="240" r="7" opacity="0.16" />
              <circle cx="120" cy="250" r="6" opacity="0.15" />
              <circle cx="900" cy="500" r="6" opacity="0.15" />
            </g>
            {/* Big chip outline partially behind the headline */}
            <g opacity="0.16">
              <rect x="60" y="60" width="460" height="300" fill="none" stroke="#B87333" strokeWidth="2" />
              <rect x="84" y="84" width="412" height="252" fill="none" stroke="#B87333" strokeWidth="1" />
              <g stroke="#B87333" strokeWidth="3">
                <line x1="110" y1="60" x2="110" y2="38" />
                <line x1="180" y1="60" x2="180" y2="38" />
                <line x1="250" y1="60" x2="250" y2="38" />
                <line x1="320" y1="60" x2="320" y2="38" />
                <line x1="390" y1="60" x2="390" y2="38" />
                <line x1="460" y1="60" x2="460" y2="38" />
                <line x1="110" y1="360" x2="110" y2="382" />
                <line x1="180" y1="360" x2="180" y2="382" />
                <line x1="250" y1="360" x2="250" y2="382" />
                <line x1="320" y1="360" x2="320" y2="382" />
                <line x1="390" y1="360" x2="390" y2="382" />
                <line x1="460" y1="360" x2="460" y2="382" />
                <line x1="60" y1="120" x2="38" y2="120" />
                <line x1="60" y1="200" x2="38" y2="200" />
                <line x1="60" y1="280" x2="38" y2="280" />
                <line x1="520" y1="120" x2="542" y2="120" />
                <line x1="520" y1="200" x2="542" y2="200" />
                <line x1="520" y1="280" x2="542" y2="280" />
              </g>
            </g>
            {/* Scattered component nodes and pads */}
            <g fill="#B87333">
              <rect x="980" y="120" width="14" height="14" opacity="0.16" />
              <rect x="1050" y="420" width="14" height="14" opacity="0.14" />
              <rect x="620" y="100" width="12" height="12" opacity="0.14" />
              <circle cx="1020" cy="200" r="4" opacity="0.18" />
              <circle cx="580" cy="480" r="4" opacity="0.16" />
              <circle cx="240" cy="440" r="4" opacity="0.16" />
              <circle cx="760" cy="140" r="4" opacity="0.15" />
              <circle cx="60" cy="520" r="4" opacity="0.15" />
            </g>
          </svg>
          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            {/* LEFT — badge, headline, story, buttons */}
            <div>
              <p>
                <span className="label inline-block rounded-full border border-copper px-3 py-1 text-accent">
                  RE-PREPARATION PROTOCOL
                </span>
              </p>
              <h1
                className="font-display mt-4 font-bold"
                style={{ fontSize: "clamp(3.5rem, 8vw, 6.5rem)", lineHeight: 0.95 }}
              >
                <span className="text-cream">NEVER</span><span className="text-gold">TWICE</span>
              </h1>
              <p className="mt-5 max-w-[52ch] border-l-2 border-copper pl-4 font-mono text-[15px] leading-relaxed text-cream">
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
                <Link href="#how" className="font-mono text-sm text-cream-dim underline transition-colors duration-200 hover:text-accent sm:ml-1">
                  How it works
                </Link>
              </div>
            </div>
            {/* RIGHT — one tilted ledger card, inverted to cream */}
            <div className="card bg-cream text-pcb-deep lg:rotate-[1.5deg]">
              <p className="label text-pcb-deep">MISSION LEDGER</p>
              <dl className="mt-3 space-y-2" aria-label="NET format ledger">
                {LEDGER.map((s) => (
                  <div key={s.l} className="copper-border flex items-baseline justify-between gap-3 bg-[rgba(15,59,44,0.08)] px-4 py-3">
                    <dt className="sr-only">{s.l}</dt>
                    <dd className="font-display text-3xl font-bold text-gold">{s.v}</dd>
                    <dd className="label text-pcb-deep">{s.l}</dd>
                  </div>
                ))}
              </dl>
              <Link href="#board" className="mt-4 block rounded-lg border-[1.5px] border-pcb-deep bg-pcb px-6 py-3 text-center font-display font-bold uppercase tracking-wider text-cream transition-all duration-200 hover:bg-pcb-panel active:translate-y-px">
                View the board →
              </Link>
            </div>
          </div>
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
