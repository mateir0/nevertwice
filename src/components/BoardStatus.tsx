"use client";

import { useMemo } from "react";
import { Cpu } from "lucide-react";
import { useSessions, useWeaknessNodes } from "@/hooks/useExam";
import { ERROR_TYPES } from "@/engine/exam-engine";
import { loadActiveDrill, planDrill } from "@/engine/drill-planner";

/**
 * Live threat-board furniture for the landing page. Every number here is
 * read from the same localStorage sources the board itself renders —
 * nothing hardcoded, no phantom data.
 */

/** ACTIVE THREATS: nodes with mistakeCount > 0 (the board's CLEAN lines excluded). */
export function ThreatBadge() {
  const nodes = useWeaknessNodes();
  const active = nodes.filter((n) => n.mistakeCount > 0).length;
  return (
    <div className="flex items-center gap-2 border border-bronze bg-panel px-3 py-2" aria-label={`${active} active threats`}>
      <span className="font-display rounded bg-blood px-2 py-0.5 text-lg text-parchment">
        {active}
      </span>
      <span className="label">ACTIVE THREATS</span>
    </div>
  );
}

function errorLabel(v: string): string {
  return ERROR_TYPES.find((t) => t.value === v)?.label ?? v.toUpperCase();
}

/**
 * WEAKNESS BUS status strip. LAST FAULT is the newest classified mistake
 * across all stored sessions; DRILL QUEUED is the saved active drill when
 * one exists, else the freshly planned drill for the current graph.
 * Empty states say so explicitly instead of inventing traffic.
 */
export function BoardStatusStrip() {
  const nodes = useWeaknessNodes();
  const { sessions } = useSessions();

  const lastFault = sessions
    .flatMap((s) => s.mistakes)
    .sort((a, b) => b.timestamp - a.timestamp)[0] ?? null;

  // Recompute the queued drill whenever sessions or the weakness graph move.
  const graphKey = nodes.map((n) => `${n.topic}::${n.subtopic}:${n.mistakeCount}`).join("|");
  const queued = useMemo(() => {
    const saved = loadActiveDrill();
    if (saved) {
      return { total: saved.questions.length, subs: saved.targets.map((t) => t.subtopic) };
    }
    const fresh = planDrill();
    if (!fresh) return null;
    return { total: fresh.targets.reduce((n, t) => n + t.count, 0), subs: fresh.targets.map((t) => t.subtopic) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, graphKey]);

  return (
    <div className="mt-4 flex flex-col gap-2 border border-bronze/60 bg-panel p-3 font-type text-[12.5px] uppercase leading-relaxed tracking-[0.08em] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6" aria-label="Board status">
      <p className="flex items-center gap-2 text-parchment">
        <Cpu className="h-4 w-4 text-amber" aria-hidden="true" />
        WEAKNESS BUS: <span className="font-bold text-amber">ROUTING</span>
      </p>
      <p className="text-faded">
        {lastFault
          ? `LAST FAULT: ${lastFault.subtopic.toUpperCase()} — ${errorLabel(lastFault.errorType)} (+1)`
          : "LAST FAULT: NONE FILED YET"}
      </p>
      <p className="text-faded">
        {queued
          ? `DRILL QUEUED: ${queued.total} REPS · ${queued.subs.map((s) => s.toUpperCase()).join(" × ")}`
          : "DRILL QUEUED: NONE — RUN A SESSION"}
      </p>
    </div>
  );
}
