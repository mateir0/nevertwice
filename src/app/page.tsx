"use client";

import Link from "next/link";
import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";
import { RecentSessions } from "@/components/RecentSessions";
import { useSessions, useWeaknessNodes } from "@/hooks/useExam";

export default function HomePage() {
  const nodes = useWeaknessNodes();
  const { sessions } = useSessions();

  return (
    <div className="mx-auto w-full max-w-[480px] px-4 py-6">
      <header className="mb-6 text-center">
        <h1
          className="font-display tracking-widest text-crt-green"
          style={{
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            textShadow:
              "0 0 12px rgba(51,255,0,0.45), 0 0 32px rgba(51,255,0,0.2), 0 0 48px rgba(255,176,0,0.25)",
          }}
        >
          NEVER<span className="text-phosphor-amber">TWICE</span>
        </h1>
        <p className="mt-1 font-mono text-xs tracking-widest text-static-grey">
          NUST ENTRY TEST • RE-PREPARATION MODE
        </p>
      </header>

      <main className="space-y-5">
        <section aria-label="Next step" className="card crt-glow">
          <p className="font-mono text-[11px] tracking-widest text-static-grey">
            YOUR NEXT 15 MINUTES
          </p>
          <p className="font-display mt-1 text-2xl tracking-wide">
            20 QUESTIONS • 18 MINUTES • PACED
          </p>
          <p className="mt-1 font-mono text-sm text-static-grey">
            One question at a time. Wrong answers get classified so the heatmap learns.
          </p>
          <Link href="/session" className="btn-primary mt-4 block text-center text-lg">
            BEGIN
          </Link>
        </section>

        <WeaknessHeatmap nodes={nodes} title="WEAKNESS HEATMAP" />

        <RecentSessions sessions={sessions} />
      </main>

      <footer className="mt-8 text-center">
        <p className="font-mono text-[11px] tracking-widest text-static-grey">
          BUILT SO HE NEVER LOSES THE SAME MARK TWICE
        </p>
      </footer>
    </div>
  );
}
