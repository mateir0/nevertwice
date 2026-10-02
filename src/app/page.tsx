import Link from "next/link";
import { Star, Zap, Crosshair, CircuitBoard, Target, Cpu, FileWarning } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { TraceDivider } from "@/components/TraceDivider";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";
import { DossierBackdrop } from "@/components/DossierBackdrop";

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
    title: "Watch the threat board",
    body: "Every miss filed onto your dossier.",
    icon: CircuitBoard,
  },
  {
    n: "04",
    title: "Drill what leaks",
    body: "Targeted reps until the board runs clean.",
    icon: Target,
  },
];

export default function LandingPage() {
  const activeNets = 0;

  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-6 md:px-8">
      {/* Atmosphere: film grain + vignette */}
      <div aria-hidden="true" className="grain" />
      <div aria-hidden="true" className="vignette" />
      {/* Archival backdrop: glows, star watermarks, redacted file, stamp */}
      <DossierBackdrop />

      {/* STICKY HEADER — dark dossier bar */}
      <header
        className="sticky top-0 z-[100] mx-[calc(50%-50vw)] border-b border-bronze bg-night/95 px-4 py-3.5 backdrop-blur md:px-8"
        style={{ boxShadow: "0 4px 18px rgba(0,0,0,0.6)" }}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center gap-5 px-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Star className="h-4 w-4 fill-blood text-blood" aria-hidden="true" />
            <span className="font-display text-lg tracking-[0.08em] text-parchment">
              NEVERTWICE
            </span>
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-5 font-type text-[13px] uppercase tracking-[0.18em] text-faded sm:flex">
            <Link href="#board" className="transition-colors duration-200 hover:text-parchment">
              Board
            </Link>
            <span aria-hidden="true" className="text-[10px] text-bronze">◆</span>
            <Link href="#how" className="transition-colors duration-200 hover:text-parchment">
              How it works
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden font-type text-[11px] uppercase tracking-[0.22em] text-amber sm:inline">
              ● REC
            </span>
            <Link href="/app" className="btn-primary px-5 py-2 text-sm">
              BEGIN
            </Link>
          </div>
        </div>
      </header>

      <main className="relative space-y-6 pt-6">
        {/* SECTION 1 — HERO */}
        <section aria-label="Briefing" className="reveal relative overflow-hidden px-1 py-12 sm:px-2">
          <div className="relative z-[1] grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            {/* LEFT */}
            <div>
              <p className="flex items-center gap-3">
                <Star className="h-3.5 w-3.5 fill-blood text-blood" aria-hidden="true" />
                <span className="label !text-amber">
                  Dossier Nº 001 — Re-preparation protocol
                </span>
              </p>
              <h1
                className="font-display mt-5"
                style={{ fontSize: "clamp(2.6rem, 10vw, 4.6rem)", lineHeight: 1 }}
              >
                <span className="text-parchment">NEVER</span>{" "}
                <span className="text-blood">TWICE</span>
              </h1>
              <p className="mt-6 max-w-[52ch] border-l-2 border-blood pl-4 font-type text-[16px] leading-relaxed text-parchment/90">
                My brother missed NUST. I built him the thing that makes sure
                he never loses the same mark twice.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link href="/app" className="btn-primary flex items-center justify-center gap-2 text-base sm:min-w-[200px]">
                  <Zap className="h-4 w-4" aria-hidden="true" />
                  BEGIN
                </Link>
                <Link href="/app" className="btn-secondary flex items-center justify-center gap-2 text-base sm:min-w-[200px]">
                  Open app →
                </Link>
              </div>
              <p className="mt-5 font-type text-xs uppercase tracking-[0.2em] text-faded">
                <Link href="#how" className="underline decoration-bronze underline-offset-4 transition-colors hover:text-parchment">
                  How it works
                </Link>
                {"  "}· No accounts · No fluff
              </p>
            </div>

            {/* RIGHT — one tilted case file */}
            <div
              className="card lg:rotate-2"
              style={{ boxShadow: "0 18px 44px rgba(0,0,0,0.6)" }}
            >
              <div className="flex items-center justify-between">
                <p className="label !text-parchment">Case file</p>
                <span className="rubber-stamp stamp text-[10px]">Active</span>
              </div>
              <dl className="mt-4 space-y-2.5" aria-label="NET format file">
                {LEDGER.map((s) => (
                  <div key={s.l} className="flex items-baseline justify-between gap-3 border border-bronze/60 bg-night px-4 py-3">
                    <dt className="sr-only">{s.l}</dt>
                    <dd className="font-display text-3xl text-amber">{s.v}</dd>
                    <dd className="font-type text-[11px] uppercase tracking-[0.2em] text-faded">{s.l}</dd>
                  </div>
                ))}
              </dl>
              <Link href="#board" className="btn-primary mt-5 block text-center text-sm">
                View the board →
              </Link>
            </div>
          </div>
        </section>

        {/* Remaining sections */}
        <div className="space-y-6">
            <TraceDivider label="FIG. I — THE BRIEFING" />

            {/* SECTION 2 — THE PROTOCOL */}
            <section id="how" aria-label="The protocol" className="card reveal scroll-mt-24" style={{ animationDelay: "90ms" }}>
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-2xl tracking-[0.06em] text-parchment">
                  THE PROTOCOL
                </h2>
                <span className="label">4 steps · zero mercy</span>
              </div>
              <ol className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:flex lg:flex-row lg:items-stretch">
                {STEPS.map((s, i) => (
                  <li key={s.n} className="contents">
                    <div className="flex-1 border border-bronze/60 bg-night p-4">
                      <p className="flex items-center justify-between">
                        <span className="font-display text-xl text-blood">{s.n}</span>
                        <s.icon className="h-5 w-5 text-bronze" aria-hidden="true" />
                      </p>
                      <p className="font-display mt-2 text-[15px] tracking-[0.04em] text-parchment">{s.title}</p>
                      <p className="mt-2 font-type text-[13.5px] leading-relaxed text-faded">{s.body}</p>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span aria-hidden="true" className="hidden shrink-0 items-center font-display text-xl text-bronze lg:flex">
                        →
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <TraceDivider label="FIG. II — THE METHOD" />

            {/* SECTION 3 — THREAT BOARD */}
            <section id="board" aria-label="The board" className="reveal scroll-mt-24" style={{ animationDelay: "180ms" }}>
              <p className="label text-center">WELCOME TO NEVERTWICE</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl tracking-[0.06em] text-parchment">
                    <span className="text-blood">★</span> THE THREAT BOARD
                  </h2>
                  <p className="mt-1 font-type text-[15px] text-faded">
                    You have one mission. Make every mark count.
                  </p>
                </div>
                <div className="flex items-center gap-2 border border-bronze bg-panel px-3 py-2" aria-label={`${activeNets} active threats`}>
                  <span className="font-display rounded bg-blood px-2 py-0.5 text-lg text-parchment">
                    {activeNets}
                  </span>
                  <span className="label">ACTIVE THREATS</span>
                </div>
              </div>

              {/* Status strip */}
              <div className="mt-4 flex flex-col gap-2 border border-bronze/60 bg-panel p-3 font-type text-[12.5px] uppercase leading-relaxed tracking-[0.08em] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6" aria-label="Board status">
                <p className="flex items-center gap-2 text-parchment">
                  <Cpu className="h-4 w-4 text-amber" aria-hidden="true" />
                  WEAKNESS BUS: <span className="font-bold text-amber">ROUTING</span>
                </p>
                <p className="text-faded">LAST FAULT: Quadratic Equations — misread (+1)</p>
                <p className="text-faded">DRILL QUEUED: 12 reps · Kinematics × Calculus</p>
              </div>

              <div className="mt-4">
                <WeaknessHeatmap
                  nodes={[]}
                  title="THE BOARD — LIVE CIRCUIT"
                  emptyAction={{ href: "/app", label: "BEGIN" }}
                />
              </div>
            </section>

            <TraceDivider label="FIG. III — THE APPARATUS" />

            {/* SECTION 4 — FOOTER */}
            <footer className="reveal px-4 py-10 text-center" style={{ animationDelay: "270ms" }}>
              <div aria-hidden="true" className="mx-auto flex max-w-md items-center gap-3">
                <span className="dossier-line flex-1" />
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-bronze bg-panel">
                  <Star className="h-6 w-6 fill-blood text-blood" aria-hidden="true" />
                </span>
                <span className="dossier-line flex-1" />
              </div>
              <div className="mt-6">
                <Wordmark align="center" size="clamp(2rem, 5vw, 3rem)" />
              </div>
              <p className="mt-4 font-type text-[15px] text-faded">
                Built so he never loses the same mark twice.
              </p>
              <p className="mt-8 flex items-center justify-end gap-2 font-type text-xs uppercase tracking-[0.2em] text-faded">
                <FileWarning className="h-3.5 w-3.5 text-bronze" aria-hidden="true" />
                A Hashir original.
              </p>
            </footer>
        </div>
      </main>
    </div>
  );
}
