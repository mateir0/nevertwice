"use client";

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

export function RecentSessions({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <section aria-label="Recent sessions" className="card">
        <h2 className="font-display text-xl tracking-widest">RECENT SESSIONS</h2>
        <p className="mt-2 font-mono text-sm text-static-grey">
          NO SESSIONS YET — HIT BEGIN ABOVE.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Recent sessions" className="card">
      <h2 className="font-display text-xl tracking-widest">RECENT SESSIONS</h2>
      <ul className="mt-3 space-y-2">
        {sessions.slice(0, 5).map((s) => {
          const acc = s.questionsAttempted > 0 ? Math.round((s.correct / s.questionsAttempted) * 100) : 0;
          return (
            <li
              key={s.id}
              className="terminal-border flex items-center justify-between gap-3 bg-terminal-bg p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-static-grey">{formatDate(s.date)}</p>
                <p className="font-mono text-sm">
                  {s.correct}/{s.questionsAttempted} • {acc}% • {s.mistakes.length} ERR
                </p>
              </div>
              <span
                className="font-display text-lg"
                style={{ color: acc >= 70 ? "#33FF00" : acc >= 40 ? "#FFB000" : "#CC0000" }}
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
