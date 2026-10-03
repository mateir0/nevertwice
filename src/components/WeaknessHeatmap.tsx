"use client";

import Link from "next/link";
import { CircuitBoard } from "lucide-react";
import type { WeaknessNode } from "@/types";

interface HeatmapProps {
  nodes: WeaknessNode[];
  title?: string;
  highlightKeys?: string[];
  emptyAction?: { href: string; label: string };
}

function keyOf(n: WeaknessNode): string {
  return `${n.topic}::${n.subtopic}`;
}

interface LineStyle {
  backgroundColor: string;
  color: string;
  borderColor: string;
  glow: string;
}

/** Fault lines burn blood-red, watch lines run bronze, clean lines show olive. */
function lineStyle(count: number, max: number): LineStyle {
  if (count <= 0) {
    return { backgroundColor: "#6B7F4E", color: "#0B0906", borderColor: "#6B7F4E", glow: "none" };
  }
  const t = max > 0 ? Math.min(count / max, 1) : 1;
  if (t > 0.66) {
    return {
      backgroundColor: "#B3202C",
      color: "#E8DCC0",
      borderColor: "#B3202C",
      glow: "0 0 12px rgba(179,32,44,0.5)",
    };
  }
  if (t > 0.33) {
    return { backgroundColor: "#A67C3D", color: "#0B0906", borderColor: "#A67C3D", glow: "none" };
  }
  return { backgroundColor: "#D9A441", color: "#0B0906", borderColor: "#D9A441", glow: "none" };
}

function trendGlyph(trend: WeaknessNode["trend"]): string {
  if (trend === "rising") return "▲";
  if (trend === "falling") return "▼";
  return "●";
}

export function WeaknessHeatmap({
  nodes,
  title = "WEAKNESS HEATMAP",
  highlightKeys = [],
  emptyAction = { href: "/session", label: "BEGIN" },
}: HeatmapProps) {
  const highlighted = new Set(highlightKeys);

  if (nodes.length === 0) {
    return (
      <section aria-label={title} className="card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl tracking-[0.06em] text-parchment">{title}</h2>
          <span className="rounded-full border border-bronze bg-night px-2 py-1 font-type text-[11px] tracking-[0.2em] text-bronze">
            REV A
          </span>
        </div>
        <div className="flex flex-col items-center border border-bronze/60 bg-night px-4 py-8 text-center">
          <CircuitBoard className="h-10 w-10 text-bronze" strokeWidth={1.5} aria-hidden="true" />
          <p className="font-display mt-3 text-xl tracking-[0.06em] text-parchment">BOARD UNPOPULATED</p>
          <p className="mt-2 max-w-[52ch] font-type text-[14px] leading-relaxed text-faded">
            No nodes filed yet. Complete a session and every classified mistake
            is entered into this dossier.
          </p>
          <Link href={emptyAction.href} className="btn-primary mt-5 text-sm">
            {emptyAction.label}
          </Link>
        </div>
      </section>
    );
  }

  const max = Math.max(...nodes.map((n) => n.mistakeCount), 1);

  // Group subtopic lines by topic, hottest first.
  const groups = new Map<string, WeaknessNode[]>();
  for (const n of nodes) {
    const list = groups.get(n.topic) ?? [];
    list.push(n);
    groups.set(n.topic, list);
  }
  const ordered = Array.from(groups.entries())
    .map(([topic, list]) => ({
      topic,
      list: [...list].sort((a, b) => b.mistakeCount - a.mistakeCount),
      heat: Math.max(...list.map((n) => n.mistakeCount)),
    }))
    .sort((a, b) => b.heat - a.heat);

  return (
    <section aria-label={title} className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl tracking-[0.06em] text-parchment">{title}</h2>
        <div className="flex items-center gap-3 font-type text-[11px] uppercase tracking-[0.14em] text-faded">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-blood" />
            FAULT
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-bronze" />
            WATCH
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-olive" />
            CLEAN
          </span>
        </div>
      </div>

      <div className="space-y-5 border border-bronze/60 bg-night p-3 sm:p-4" role="list" aria-label="Threat board">
        {ordered.map((g) => (
          <div key={g.topic}>
            <div className="mb-2 flex flex-nowrap items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 shrink-0 rounded-full border-2"
                style={{ borderColor: "#A67C3D", backgroundColor: g.heat > 0 ? "#B3202C" : "#6B7F4E" }}
              />
              <span className="min-w-0 truncate font-type text-[13px] font-bold uppercase tracking-[0.14em] text-parchment">{g.topic}</span>
              <span aria-hidden="true" className="dossier-line min-w-4 flex-1" />
              <span className="shrink-0 whitespace-nowrap font-type text-[11px] uppercase tracking-[0.14em] text-faded">
                {g.heat} FAULT{g.heat === 1 ? "" : "S"}
              </span>
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))" }}
            >
              {g.list.map((node) => {
                const k = keyOf(node);
                const s = lineStyle(node.mistakeCount, max);
                const isNew = highlighted.has(k);
                return (
                  <div
                    key={k}
                    role="listitem"
                    aria-label={`${node.topic} ${node.subtopic}: ${node.mistakeCount} mistakes, trend ${node.trend}`}
                    className="relative rounded transition-all duration-200"
                    style={{
                      backgroundColor: s.backgroundColor,
                      border: `1.5px solid ${s.borderColor}`,
                      boxShadow: s.glow,
                      outline: isNew ? "2px solid #D9A441" : "none",
                      outlineOffset: "2px",
                    }}
                  >
                    <div
                      className="flex min-h-[72px] flex-col items-center justify-center p-1.5 text-center"
                      style={{ color: s.color }}
                    >
                      <span className="font-display text-[14px] leading-tight">{node.subtopic}</span>
                      <span className="font-type text-[10px] leading-tight">
                        {node.mistakeCount} ERR · {trendGlyph(node.trend)}
                      </span>
                      {isNew && <span className="via-live mt-1 inline-block h-1.5 w-1.5 rounded-full bg-night" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 font-type text-[11px] uppercase tracking-[0.14em] text-faded">
        {nodes.length} NODES FILED · MAX {max} FAULTS
      </p>
    </section>
  );
}
