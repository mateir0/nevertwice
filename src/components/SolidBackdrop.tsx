"use client";

import { useEffect } from "react";

/**
 * Route-scoped backdrop: flattens the global PCB grid texture to a clean
 * solid #0F3B2C while the landing page is mounted. Restored on unmount
 * so /app, /session and /results keep their texture.
 */
export function SolidBackdrop() {
  useEffect(() => {
    const body = document.body;
    const prevImage = body.style.backgroundImage;
    const prevColor = body.style.backgroundColor;
    body.style.backgroundImage = "none";
    body.style.backgroundColor = "#0F3B2C";
    return () => {
      body.style.backgroundImage = prevImage;
      body.style.backgroundColor = prevColor;
    };
  }, []);
  return null;
}
