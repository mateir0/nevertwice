/**
 * Copper trace connector between sections —
 * a routed trace with solder-pad vias at each end.
 */
export function TraceDivider() {
  return (
    <div aria-hidden="true" className="flex items-center gap-2 py-1">
      <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-copper bg-parchment" />
      <span className="trace-divider-line flex-1" />
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-copper" />
      <span className="trace-divider-line hidden w-16 sm:block" />
      <span className="hidden h-2.5 w-2.5 rounded-full border-2 border-copper bg-parchment sm:inline-block" />
    </div>
  );
}
