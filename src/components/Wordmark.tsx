"use client";

interface WordmarkProps {
  size?: string;
  align?: "left" | "center";
}

/**
 * NEVERTWICE wordmark — Warm Light edition.
 * Dark brown Courier New 700 with a copper trace rule and gold via.
 * Single treatment, never two-tone.
 */
export function Wordmark({ size = "clamp(2.5rem, 5vw, 4rem)", align = "center" }: WordmarkProps) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <h1
        className="font-display font-bold tracking-wide text-ink"
        style={{ fontSize: size, lineHeight: 1 }}
      >
        NEVERTWICE
      </h1>
      <div
        aria-hidden="true"
        className={`mt-2 flex items-center gap-2 ${align === "center" ? "justify-center" : "justify-start"}`}
      >
        <span className="trace-divider-line w-24 sm:w-40" />
        <span className="inline-block h-2 w-2 rounded-full bg-gold" />
        <span className="trace-divider-line w-8 sm:w-16" />
      </div>
    </div>
  );
}
