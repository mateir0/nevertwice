"use client";

import { WeaknessHeatmap } from "@/components/WeaknessHeatmap";
import { useWeaknessNodes } from "@/hooks/useExam";

export function LandingBoard() {
  const nodes = useWeaknessNodes();

  return (
    <WeaknessHeatmap
      nodes={nodes}
      title="THE BOARD — LIVE CIRCUIT"
      emptyAction={{ href: "/app", label: "BEGIN" }}
    />
  );
}
