"use client";

import type { WeaknessNode } from "@/types";

interface HeatmapProps {
  nodes: WeaknessNode[];
  title?: string;
  highlightKeys?: string[];
}

function keyOf(n: WeaknessNode): string {
  return `${n.topic}::${n.subtopic}`;
}

function cellColor(count: number, max: number): string {
  if (count <= 0) return "#33FF00";
  const t = max > 0 ? Math.min(count / max, 1) : 1;
  // amber (#FFB000) for weak -> deep orange/red as intensity rises
  if (t > 0.66) return "#CC0000";
  if (t > 0.33) return "#FF6600";
  return "#FFB000";
}

export function WeaknessHeatmap({ nodes, title = "WEAKNESS HEATMAP", highlightKeys = [] }: HeatmapProps) {
  const max = Math.max(...nodes.map((n) => n.mistakeCount), 1);
  const sorted = [...nodes].sort((a, b) => b.mistakeCount - a.mistakeCount);
  const highlighted = new Set(highlightKeys);

  if (nodes.length === 0) {
    return (
      <section aria-label={title} className="card phosphor-grid">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl tracking-widest text-phosphor-amber">{title}</h2>
          <span className="terminal-border bg-terminal-bg px-2 py-1 font-mono text-[11px] tracking-widest text-crt-green">
            ● LIVE FEED
          </span>
        </div>
        <div className="terminal-border bg-terminal-bg p-4 font-mono text-[13px] leading-relaxed">
          <p className="text-crt-green">&gt; weakness_graph --status</p>
          <p className="text-static-grey">[······] scanning 0 nodes … nothing indexed yet</p>
          <p className="text-crt-green">&gt; signal: <span className="text-phosphor-amber">AWAITING FIRST SESSION</span></p>
          <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="terminal-border flex h-12 items-center justify-center font-display text-lg text-terminal-border"
              >
                ░
              </div>
            ))}
          </div>
          <p className="mt-3 text-static-grey">
            Every mistake you classify lights up a cell. Run one session and this grid starts learning where you bleed marks.
          </p>
          <p className="mt-1 text-crt-green">
            &gt; next_action: <span className="underline">HIT BEGIN — 20 QUESTIONS, 18 MINUTES</span>
            <span className="animate-pulse"> ▊</span>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label={title} className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl tracking-widest text-phosphor-amber">{title}</h2>
        <div className="flex items-center gap-3 font-mono text-[11px] text-static-grey">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#FFB000" }} />
            WEAK
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "#33FF00" }} />
            STRONG
          </span>
        </div>
      </div>
      <div
        className="phosphor-grid terminal-border grid gap-2 p-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))" }}
        role="list"
      >
        {sorted.map((node) => {
          const k = keyOf(node);
          const bg = cellColor(node.mistakeCount, max);
          const isNew = highlighted.has(k);
          return (
            <div
              key={k}
              role="listitem"
              aria-label={`${node.topic} ${node.subtopic}: ${node.mistakeCount} mistakes, trend ${node.trend}`}
              className="terminal-border flex min-h-[64px] flex-col items-center justify-center p-1 text-center"
              style={{
                backgroundColor: bg,
                color: "#1a1a1a",
                outline: isNew ? "2px solid #E8E0D0" : "none",
                outlineOffset: isNew ? "1px" : "0",
                animation: isNew ? "heat-pop 0.5s ease-out" : "none",
              }}
            >
              <span className="font-display text-sm leading-tight">{node.subtopic}</span>
              <span className="font-mono text-[10px] leading-tight">
                {node.mistakeCount} ERR • {node.trend === "rising" ? "▲" : node.trend === "falling" ? "▼" : "●"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[11px] text-static-grey">
        {nodes.length} NODES TRACKED • MAX {max} ERRORS
      </p>
    </section>
  );
}
