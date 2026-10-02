"use client";

import { useCallback, useEffect, useState } from "react";
import { ExamEngine } from "@/engine/exam-engine";
import type { Session, WeaknessNode } from "@/types";

export function useWeaknessNodes(): WeaknessNode[] {
  const [nodes, setNodes] = useState<WeaknessNode[]>([]);
  useEffect(() => {
    setNodes(ExamEngine.getWeaknessNodes());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "nevertwice-weakness") setNodes(ExamEngine.getWeaknessNodes());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return nodes;
}

export function useSessions(): {
  sessions: Session[];
  refresh: () => void;
} {
  const [sessions, setSessions] = useState<Session[]>([]);
  const refresh = useCallback(() => {
    setSessions(ExamEngine.getSessions());
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { sessions, refresh };
}
