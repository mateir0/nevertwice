/**
 * Engraved copper trace connector between sections —
 * a routed trace with node dots and a tiny engraved plate label.
 */
export function TraceDivider({ label }: { label?: string }) {
  return (
    <div aria-hidden="true" className="relative flex items-center gap-2 py-1">
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2 border-copper bg-parchment" />
      <span className="trace-divider-line flex-1" />
      {label ? (
        <span className="font-label shrink-0 bg-parchment px-2 text-[11px] tracking-[0.14em] text-copper">
          {label}
        </span>
      ) : (
        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-copper" />
      )}
      <span className="trace-divider-line hidden w-16 sm:block" />
      <span className="hidden h-2.5 w-2.5 shrink-0 rounded-full border-2 border-copper bg-parchment sm:inline-block" />
    </div>
  );
}
