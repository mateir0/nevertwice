"use client";

interface WordmarkProps {
  size?: string;
  align?: "left" | "center";
}

/**
 * NEVERTWICE wordmark — Dossier edition.
 * Russo One, parchment, bronze rule with a blood-red node.
 */
export function Wordmark({ size = "clamp(2.5rem, 5vw, 4rem)", align = "center" }: WordmarkProps) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <p
        className="font-display tracking-[0.06em] text-parchment"
        style={{ fontSize: size, lineHeight: 1 }}
      >
        NEVERTWICE
      </p>
      <div
        aria-hidden="true"
        className={`mt-3 flex items-center gap-2 ${align === "center" ? "justify-center" : "justify-start"}`}
      >
        <span className="dossier-line w-24 sm:w-40" />
        <span className="inline-block h-2 w-2 rounded-full bg-blood" />
        <span className="dossier-line w-8 sm:w-16" />
      </div>
    </div>
  );
}
