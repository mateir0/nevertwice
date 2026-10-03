"use client";

import { useEffect, useState } from "react";

/**
 * "OFFLINE — BANK MODE" badge. Renders nothing while online; listens to
 * online/offline events so the header reflects connectivity live.
 * Drills keep generating offline via the deterministic fallback bank.
 */
export function OfflineBadge() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOffline = () => setOnline(false);
    const goOnline = () => setOnline(true);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (online) return null;

  return (
    <span
      role="status"
      className="rounded bg-amber px-2 py-0.5 font-type text-[11px] font-bold tracking-widest text-night"
    >
      OFFLINE — BANK MODE
    </span>
  );
}
