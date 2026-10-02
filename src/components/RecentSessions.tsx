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

function accStyle(acc: number): { backgroundColor: string; color: string } {
  if (acc >= 70) return { backgroundColor: "#008080", color: "#FFFDF5" };
  if (acc >= 40) return { backgroundColor: "#B87333", color: "#FFFDF5" };
  return { backgroundColor: "#5C0000", color: "#F5DEB3" };
}

export function RecentSessions({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <section aria-label="Recent sessions" className="card">
        <h2 className="font-display flex items-center gap-2 text-2xl tracking-wide text-ink">
          <History className="h-5 w-5 text-copper" aria-hidden="true" />
          RECENT SESSIONS
        </h2>
        <p className="mt-2 font-display text-[17px] text-ink/80">
          NO SESSIONS YET — HIT BEGIN ABOVE.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Recent sessions" className="card">
      <h2 className="font-display flex items-center gap-2 text-2xl tracking-wide text-ink">
        <History className="h-5 w-5 text-copper" aria-hidden="true" />
        RECENT SESSIONS
      </h2>
      <ul className="mt-3 space-y-2">
        {sessions.slice(0, 5).map((s) => {
          const acc = s.questionsAttempted > 0 ? Math.round((s.correct / s.questionsAttempted) * 100) : 0;
          const badge = accStyle(acc);
          return (
            <li
              key={s.id}
              className="copper-border flex items-center justify-between gap-3 bg-parchment p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-ink/70">{formatDate(s.date)}</p>
                <p className="font-mono text-sm text-ink">
                  {s.correct}/{s.questionsAttempted} • {acc}% • {s.mistakes.length} ERR
                </p>
              </div>
              <span
                className="font-mono rounded px-2 py-1 text-lg font-bold"
                style={badge}
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
