"use client";

import { TrendingUp } from "lucide-react";
import type { Session } from "@/types";
import {
  buildTrajectory,
  formatDelta,
  shortDate,
  trajectoryStats,
  type TrajectoryPoint,
  type TrajectoryStats,
} from "@/engine/trajectory";

/**
 * LONG-TERM TRAJECTORY — whether the bleeding is slowing down over weeks.
 * Only real filed sessions, never interpolated: x-axis is session order,
 * not calendar days. Hand-rolled SVG, no chart library.
 */

// ---------- chart geometry (shared by line + bars) ----------

const W = 320;
const H = 180;
const PAD_L = 30;
const PAD_R = 20;
const PAD_T = 16;
const PAD_B = 24;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function xAt(i: number, n: number): number {
  if (n <= 1) return PAD_L + PLOT_W / 2;
  return PAD_L + (i / (n - 1)) * PLOT_W;
}

/** Every nth label so ~6 fit at 390px. */
function labelStep(n: number): number {
  return Math.max(1, Math.ceil(n / 6));
}

function XLabels({ points }: { points: TrajectoryPoint[] }) {
  const step = labelStep(points.length);
  const last = points.length - 1;
  return (
    <g fontFamily="var(--font-type)" fontSize="9" fill="#9A8A6B" textAnchor="middle">
      {points.map((p, i) =>
        i % step === 0 || i === last ? (
          <text
            key={p.id}
            x={xAt(i, points.length)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === last && points.length > 1 ? "end" : "middle"}
          >
            {shortDate(p.date)}
          </text>
        ) : null,
      )}
    </g>
  );
}

function AccuracyChart({ points }: { points: TrajectoryPoint[] }) {
  const n = points.length;
  const yAt = (acc: number) => PAD_T + (1 - Math.min(100, Math.max(0, acc)) / 100) * PLOT_H;
  const line = points.map((p, i) => `${xAt(i, n)},${yAt(p.accuracy)}`).join(" ");
  const desc = points.map((p, i) => `session ${i + 1}: ${p.accuracy}%`).join(", ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 w-full"
      role="img"
      aria-label={`Accuracy per session: ${desc}`}
    >
      <title>{`Accuracy per session: ${desc}`}</title>
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={yAt(t)}
            y2={yAt(t)}
            stroke="#A67C3D"
            strokeWidth="1"
            opacity={t === 0 ? 0.9 : 0.35}
          />
          <text x={PAD_L - 4} y={yAt(t) + 3} fontFamily="var(--font-type)" fontSize="9" fill="#9A8A6B" textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      {n > 1 && (
        <polyline points={line} fill="none" stroke="#A67C3D" strokeWidth="2" strokeLinejoin="round" />
      )}
      {points.map((p, i) => (
        <g key={p.id}>
          <circle
            cx={xAt(i, n)}
            cy={yAt(p.accuracy)}
            r="3.5"
            fill={p.accuracy < 50 ? "#B3202C" : "#E8DCC0"}
            stroke="#0B0906"
            strokeWidth="1"
          />
          {(i === 0 || i === n - 1) && (
            <text
              x={xAt(i, n)}
              y={yAt(p.accuracy) - 8}
              fontFamily="var(--font-type)"
              fontSize="9"
              fill="#D9A441"
              textAnchor="middle"
            >
              {p.accuracy}%
            </text>
          )}
        </g>
      ))}
      <XLabels points={points} />
    </svg>
  );
}

function MistakesChart({ points }: { points: TrajectoryPoint[] }) {
  const n = points.length;
  const max = Math.max(1, ...points.map((p) => p.mistakes));
  const base = PAD_T + PLOT_H;
  const slot = n > 0 ? PLOT_W / n : PLOT_W;
  const barW = Math.max(4, Math.min(28, slot * 0.5));
  const desc = points.map((p, i) => `session ${i + 1}: ${p.mistakes} mistakes`).join(", ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 w-full"
      role="img"
      aria-label={`Mistakes per session: ${desc}`}
    >
      <title>{`Mistakes per session: ${desc}`}</title>
      <line x1={PAD_L} x2={W - PAD_R} y1={base} y2={base} stroke="#A67C3D" strokeWidth="1" opacity="0.9" />
      <text x={PAD_L - 4} y={base + 3} fontFamily="var(--font-type)" fontSize="9" fill="#9A8A6B" textAnchor="end">
        0
      </text>
      <text x={PAD_L - 4} y={PAD_T + 3} fontFamily="var(--font-type)" fontSize="9" fill="#9A8A6B" textAnchor="end">
        {max}
      </text>
      {points.map((p, i) => {
        const h = (p.mistakes / max) * PLOT_H;
        return (
          <g key={p.id}>
            <rect
              x={xAt(i, n) - barW / 2}
              y={base - h}
              width={barW}
              height={Math.max(h, 0)}
              fill="#B3202C"
            />
            {n <= 10 && (
              <text
                x={xAt(i, n)}
                y={base - h - 4}
                fontFamily="var(--font-type)"
                fontSize="9"
                fill="#E8DCC0"
                textAnchor="middle"
              >
                {p.mistakes}
              </text>
            )}
          </g>
        );
      })}
      <XLabels points={points} />
    </svg>
  );
}

function StatsRow({ stats }: { stats: TrajectoryStats }) {
  const deltaClass =
    stats.delta > 0 ? "text-olive" : stats.delta < 0 ? "text-blood" : "text-faded";
  return (
    <div className="bronze-frame mt-3 grid grid-cols-1 gap-1 bg-night p-3 font-type text-xs tracking-widest">
      <p className="text-parchment">
        SESSIONS FILED: <span className="font-bold text-amber">{stats.count}</span>
      </p>
      <p className="text-parchment">
        FIRST → LATEST: {stats.first}% → {stats.latest}%{" "}
        <span className={`font-bold ${deltaClass}`}>(Δ{formatDelta(stats.delta)})</span>
      </p>
      <p className="text-parchment">
        TOTAL REPS: {stats.totalReps} question{stats.totalReps === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function Trajectory({ sessions }: { sessions: Session[] }) {
  const points = buildTrajectory(sessions);

  if (points.length === 0) {
    return (
      <section aria-label="Long-term trajectory" className="card">
        <h2 className="font-display flex items-center gap-2 text-2xl tracking-wide text-parchment">
          <TrendingUp className="h-5 w-5 text-bronze" aria-hidden="true" />
          LONG-TERM TRAJECTORY
        </h2>
        <p className="mt-1 font-type text-xs tracking-widest text-faded">
          EVERY SESSION FILED. THE LINE DOESN&apos;T LIE.
        </p>
        <p className="mt-3 font-display text-[17px] leading-relaxed text-parchment/80">
          NO TRAJECTORY YET — FILE A SESSION. THE LINE STARTS WITH YOUR FIRST 20.
        </p>
      </section>
    );
  }

  const stats = trajectoryStats(points);

  return (
    <section aria-label="Long-term trajectory" className="card">
      <h2 className="font-display flex items-center gap-2 text-2xl tracking-wide text-parchment">
        <TrendingUp className="h-5 w-5 text-bronze" aria-hidden="true" />
        LONG-TERM TRAJECTORY
      </h2>
      <p className="mt-1 font-type text-xs tracking-widest text-faded">
        EVERY SESSION FILED. THE LINE DOESN&apos;T LIE.
      </p>

      <StatsRow stats={stats} />

      {points.length === 1 ? (
        <>
          <AccuracyChart points={points} />
          <p className="mt-2 font-type text-xs tracking-widest text-faded">
            FILE ONE MORE SESSION TO DRAW THE LINE.
          </p>
        </>
      ) : (
        <>
          <p className="label mt-4">ACCURACY — SESSION BY SESSION</p>
          <AccuracyChart points={points} />
          <p className="label mt-4">MISTAKES — SHRINKING IS PROGRESS</p>
          <MistakesChart points={points} />
          <p className="mt-3 font-type text-[10px] tracking-widest text-faded">
            X = SESSION ORDER, NOT DAYS
          </p>
          <ul className="sr-only">
            {points.map((p, i) => (
              <li key={p.id}>
                Session {i + 1} ({shortDate(p.date)}): {p.accuracy}% accuracy, {p.mistakes} mistakes.
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
