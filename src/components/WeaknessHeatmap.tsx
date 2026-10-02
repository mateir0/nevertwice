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

/** Fault lines glow mahogany, watch lines run copper/brass, clean lines show teal. */
function lineStyle(count: number, max: number): LineStyle {
  if (count <= 0) {
    return { backgroundColor: "#008080", color: "#FFFDF5", borderColor: "#008080", glow: "none" };
  }
  const t = max > 0 ? Math.min(count / max, 1) : 1;
  if (t > 0.66) {
    return {
      backgroundColor: "#5C0000",
      color: "#F5DEB3",
      borderColor: "#5C0000",
      glow: "0 0 10px rgba(92,0,0,0.45)",
    };
  }
  if (t > 0.33) {
    return { backgroundColor: "#B87333", color: "#FFFDF5", borderColor: "#B87333", glow: "none" };
  }
  return { backgroundColor: "#B5A642", color: "#2A2118", borderColor: "#B5A642", glow: "none" };
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
          <h2 className="font-display text-2xl tracking-wide text-ink">{title}</h2>
          <span className="rounded-full border border-brass bg-parchment px-2 py-1 font-mono text-[11px] tracking-widest text-copper">
            REV A
          </span>
        </div>
        <div className="copper-border flex flex-col items-center bg-parchment px-4 py-8 text-center">
          <CircuitBoard className="h-10 w-10 text-copper" strokeWidth={1.5} aria-hidden="true" />
          <p className="font-display mt-3 text-2xl tracking-wide text-ink">BOARD UNPOPULATED</p>
          <p className="mt-2 max-w-[52ch] font-display text-[17px] leading-relaxed text-ink/80">
            No nodes routed yet. Complete a session and every classified mistake solders a new trace onto this board.
          </p>
          <Link href={emptyAction.href} className="btn-primary mt-5 text-base">
            {emptyAction.label}
          </Link>
        </div>
      </section>
    );
  }

  const max = Math.max(...nodes.map((n) => n.mistakeCount), 1);

  // Group subtopic lines by topic exchange, hottest exchanges first.
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
        <h2 className="font-display text-2xl tracking-wide text-ink">{title}</h2>
        <div className="flex items-center gap-3 font-mono text-[11px] text-ink/70">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-mahogany" />
            FAULT
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-copper" />
            WATCH
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal" />
            CLEAN
          </span>
        </div>
      </div>

      <div className="copper-border space-y-5 bg-parchment p-3 sm:p-4" role="list" aria-label="Weakness switchboard">
        {ordered.map((g) => (
          <div key={g.topic}>
            {/* Exchange header: brass terminal + engraved topic + routed trace */}
            <div className="mb-2 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-3 w-3 shrink-0 rounded-full border-2"
                style={{ borderColor: "#B5A642", backgroundColor: g.heat > 0 ? "#5C0000" : "#008080" }}
              />
              <span className="font-label text-base tracking-[0.08em] text-ink">{g.topic.toUpperCase()}</span>
              <span aria-hidden="true" className="trace-divider-line min-w-4 flex-1" />
              <span className="font-mono text-[11px] text-ink/70">
                {g.heat} FAULT{g.heat === 1 ? "" : "S"}
              </span>
            </div>
            {/* Terminal nodes: brass-framed jacks wired to the exchange */}
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
                      outline: isNew ? "2px solid #B5A642" : "none",
                      outlineOffset: "2px",
                    }}
                  >
                    {/* Binding-post stubs */}
                    <span aria-hidden="true" className="absolute -left-[5px] top-[22%] h-[3px] w-[5px] bg-brass" />
                    <span aria-hidden="true" className="absolute -left-[5px] top-[48%] h-[3px] w-[5px] bg-brass" />
                    <span aria-hidden="true" className="absolute -left-[5px] top-[74%] h-[3px] w-[5px] bg-brass" />
                    <span aria-hidden="true" className="absolute -right-[5px] top-[22%] h-[3px] w-[5px] bg-brass" />
                    <span aria-hidden="true" className="absolute -right-[5px] top-[48%] h-[3px] w-[5px] bg-brass" />
                    <span aria-hidden="true" className="absolute -right-[5px] top-[74%] h-[3px] w-[5px] bg-brass" />
                    <div
                      className="flex min-h-[72px] flex-col items-center justify-center p-1.5 text-center"
                      style={{ color: s.color }}
                    >
                      <span className="font-display text-[15px] leading-tight">{node.subtopic}</span>
                      <span className="font-mono text-[10px] leading-tight">
                        {node.mistakeCount} ERR • {trendGlyph(node.trend)}
                      </span>
                      {isNew && <span className="via-live mt-1 inline-block h-1.5 w-1.5 rounded-full bg-brass" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] text-ink/70">
        {nodes.length} NODES ROUTED • MAX {max} FAULTS
      </p>
    </section>
  );
}
