import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";

const STEPS = [
  {
    n: "01",
    title: "TAKE A SESSION",
    body: "20 questions. 18 minutes. Paced like the real NET — one question at a time, no skipping the hard ones.",
  },
  {
    n: "02",
    title: "CLASSIFY EVERY MISTAKE",
    body: "Wrong? Say why: concept gap, misread, calculation slip, time pressure. The label is the learning.",
  },
  {
    n: "03",
    title: "GET DRILLS FROM YOUR GRAPH",
    body: "Every classified error feeds your weakness graph. Next sessions target exactly where you bleed marks.",
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
      <header className="terminal-border mb-6 flex items-center justify-between gap-3 bg-charcoal px-4 py-2.5">
        <span className="font-display text-lg tracking-widest text-crt-green">NEVERTWICE</span>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-[11px] tracking-widest text-static-grey sm:inline">
            NUST ENTRY TEST • RE-PREPARATION MODE
          </span>
          <Link
            href="/app"
            className="terminal-border bg-terminal-bg px-3 py-1.5 font-display text-sm tracking-widest text-crt-green transition-colors hover:bg-crt-green hover:text-terminal-bg"
          >
            OPEN APP →
          </Link>
        </div>
      </header>

      <main className="space-y-6">
        {/* HERO */}
        <section aria-label="Intro" className="card crt-glow">
          <div className="grid gap-6 md:grid-cols-[1.25fr_1fr] md:items-center">
            <div>
              <Wordmark align="left" size="clamp(2.75rem, 6vw, 4.5rem)" />
              <p className="mt-2 font-mono text-[11px] tracking-widest text-static-grey">
                NUST ENTRY TEST • RE-PREPARATION MODE
              </p>
              <p className="mt-4 max-w-[52ch] font-mono text-[15px] leading-relaxed text-off-white">
                My brother missed NUST. I built him the thing that makes sure he never loses the same mark twice.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link href="/app" className="btn-primary flex-1 text-center text-xl tracking-widest">
                  ▶ BEGIN
                </Link>
                <Link href="/app" className="btn-secondary flex-1 text-center text-xl tracking-widest">
                  LAUNCH APP
                </Link>
              </div>
              <p className="mt-3 font-mono text-xs text-static-grey">
                &gt; next drill: 20 questions • 18 minutes • paced
                <span className="animate-pulse"> ▊</span>
              </p>
            </div>
            {/* Terminal side panel — fills hero, no void */}
            <div className="terminal-border bg-terminal-bg p-4 font-mono text-[13px] leading-relaxed">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-sm tracking-widest text-phosphor-amber">NET-UPLINK // LIVE</span>
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-tape-red" />
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-phosphor-amber" />
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-crt-green" />
                </span>
              </div>
              <p className="text-crt-green">&gt; boot nevertwice v1.0 … OK</p>
              <p className="text-crt-green">&gt; weakness_graph: <span className="text-phosphor-amber">listening</span></p>
              <p className="text-static-grey">&gt; last miss: Quadratic Equations — misread (+1)</p>
              <p className="text-static-grey">&gt; drill queued: 12 reps • Kinematics × Calculus</p>
              <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
                {["QA", "KN", "EL", "GR", "▲2", "▼1", "●", "▲1"].map((c, i) => (
                  <div
                    key={i}
                    className="terminal-border flex h-11 items-center justify-center font-display text-base"
                    style={{
                      color: i % 3 === 0 ? "#FFB000" : "#33FF00",
                      backgroundColor: i % 3 === 0 ? "rgba(255,176,0,0.08)" : "rgba(51,255,0,0.06)",
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
              <p className="mt-3 border-t border-terminal-border pt-2 text-[12px] text-static-grey">
                target locked: your top 3 leaking subtopics, drilled on repeat until the graph goes green.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section aria-label="How it works" className="card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl tracking-widest text-crt-green">$ HOW_IT_WORKS</h2>
            <span className="hidden font-mono text-[11px] tracking-widest text-static-grey sm:inline">
              3 STEPS • NO ACCOUNTS • NO FLUFF
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`terminal-border bg-terminal-bg p-4 ${i === 1 ? "md:translate-y-3" : ""}`}
                style={i === 1 ? { borderColor: "#FFB000" } : undefined}
              >
                <p
                  className="font-display text-3xl"
                  style={{ color: i === 1 ? "#FFB000" : "#33FF00" }}
                >
                  {s.n}
                </p>
                <p className="mt-1 font-display text-xl tracking-widest">{s.title}</p>
                <p className="mt-2 font-mono text-[13px] leading-relaxed text-static-grey">{s.body}</p>
                <p className="mt-3 font-mono text-[11px] text-crt-green">
                  {i === 0 ? "> session --start 20q" : i === 1 ? "> classify --required" : "> drills --from-graph"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* HEATMAP PREVIEW */}
        <section aria-label="Weakness graph preview">
          <WeaknessHeatmap nodes={[]} title="WEAKNESS HEATMAP — PREVIEW" />
          <p className="mt-2 text-center font-mono text-[11px] tracking-widest text-static-grey">
            PREVIEW SHOWS THE EMPTY TERMINAL STATE • YOUR LIVE GRAPH LIVES IN THE APP
          </p>
        </section>

        {/* NET FORMAT STRIP */}
        <section aria-label="NET format" className="card phosphor-glow" style={{ borderColor: "#FFB000" }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl tracking-widest text-phosphor-amber">NET FORMAT // KNOW THE ARENA</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {NET_STATS.map((s) => (
              <div key={s.l} className="terminal-border bg-terminal-bg p-4 text-center">
                <p className="font-display text-4xl text-crt-green">{s.v}</p>
                <p className="mt-1 font-mono text-[11px] tracking-widest text-static-grey">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[13px] leading-relaxed text-static-grey">
            200 MCQs in 180 minutes means ~54 seconds per question with no negative marking — speed and accuracy both
            count, and every repeated mistake is a free mark thrown away. That&apos;s exactly what the graph kills.
          </p>
          <Link href="/app" className="btn-primary mt-4 block text-center text-xl tracking-widest">
            BEGIN → ENTER THE APP
          </Link>
        </section>
      </main>

      <footer className="terminal-border mt-6 bg-charcoal px-4 py-4 text-center">
        <p className="font-display text-xl tracking-widest text-crt-green">BUILT SO HE NEVER LOSES THE SAME MARK TWICE</p>
        <p className="mt-1 font-mono text-[11px] tracking-widest text-static-grey">
          NEVERTWICE • NUST NET RE-PREPARATION • <Link href="/app" className="underline hover:text-crt-green">OPEN APP</Link>
        </p>
      </footer>
    </div>
  );
}
