"use client";

import { History } from "lucide-react";
import type { Session } from "@/types";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days <= 0) return `TODAY ${time}`;
  if (days === 1) return `YDAY ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }).toUpperCase() + ` ${time}`;
}

function accColor(acc: number): string {
  if (acc >= 70) return "#165B45";
  if (acc >= 40) return "#FFD700";
  return "#B3402E";
}

export function RecentSessions({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <section aria-label="Recent sessions" className="card">
        <h2 className="font-display flex items-center gap-2 text-xl font-bold tracking-wide">
          <History className="h-5 w-5 text-copper" aria-hidden="true" />
          RECENT SESSIONS
        </h2>
        <p className="mt-2 font-mono text-sm text-cream-dim">
          NO SESSIONS YET — HIT BEGIN ABOVE.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Recent sessions" className="card">
      <h2 className="font-display flex items-center gap-2 text-xl font-bold tracking-wide">
        <History className="h-5 w-5 text-copper" aria-hidden="true" />
        RECENT SESSIONS
      </h2>
      <ul className="mt-3 space-y-2">
        {sessions.slice(0, 5).map((s) => {
          const acc = s.questionsAttempted > 0 ? Math.round((s.correct / s.questionsAttempted) * 100) : 0;
          return (
            <li
              key={s.id}
              className="copper-border flex items-center justify-between gap-3 bg-pcb-panel p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-cream-dim">{formatDate(s.date)}</p>
                <p className="font-mono text-sm text-cream">
                  {s.correct}/{s.questionsAttempted} • {acc}% • {s.mistakes.length} ERR
                </p>
              </div>
              <span
                className="font-display rounded-md px-2 py-1 text-lg font-bold"
                style={{ backgroundColor: accColor(acc), color: acc >= 40 ? "#0B2E22" : "#EAD0AC" }}
              >
                {acc}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
