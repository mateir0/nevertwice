"use client";

import { useEffect } from "react";

let registered = false;

/** Register the offline service worker exactly once (root layout mount). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (registered) return;
    registered = true;
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is best-effort — the app works without it.
      });
    }
  }, []);
  return null;
}
