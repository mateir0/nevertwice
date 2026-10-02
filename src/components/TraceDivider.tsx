/**
 * Dossier divider — a bronze rule with node dots and a typewriter FIG label.
 */
export function TraceDivider({ label }: { label?: string }) {
  return (
    <div aria-hidden="true" className="relative flex items-center gap-3 py-1">
      <span className="inline-block h-2 w-2 shrink-0 rotate-45 border border-bronze" />
      <span className="dossier-line flex-1" />
      {label ? (
        <span className="shrink-0 bg-night px-2 font-type text-[11px] font-bold uppercase tracking-[0.24em] text-faded">
          {label}
        </span>
      ) : (
        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-bronze" />
      )}
      <span className="dossier-line hidden w-16 sm:block" />
      <span className="hidden h-2 w-2 shrink-0 rotate-45 border border-bronze sm:inline-block" />
    </div>
  );
}
