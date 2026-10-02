"use client";

interface WordmarkProps {
  size?: string;
  align?: "left" | "center";
}

/**
 * NEVERTWICE wordmark — single deliberate treatment:
 * full CRT green with phosphor glow. Never two-tone.
 */
export function Wordmark({ size = "clamp(2.5rem, 5vw, 4rem)", align = "center" }: WordmarkProps) {
  return (
    <h1
      className={`font-display tracking-widest text-crt-green ${align === "center" ? "text-center" : "text-left"}`}
      style={{
        fontSize: size,
        lineHeight: 1,
        textShadow:
          "0 0 12px rgba(51,255,0,0.55), 0 0 32px rgba(51,255,0,0.25), 0 0 64px rgba(51,255,0,0.12)",
      }}
    >
      NEVERTWICE
    </h1>
  );
}
