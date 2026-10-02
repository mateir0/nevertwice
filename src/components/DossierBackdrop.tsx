import { Star } from "lucide-react";
import { CircuitArtwork } from "@/components/CircuitArtwork";

/**
 * DossierBackdrop — the archival background layer.
 * Fixed full-page: deep red + bronze glows, giant faded star,
 * a redacted document fragment, a rubber-stamp watermark, and
 * faint bronze schematic traces. Pure atmosphere, always behind content.
 */
export function DossierBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Deep red glow, upper left */}
      <div
        className="absolute -top-48 left-[8%] h-[620px] w-[860px] rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(179,32,44,0.11) 0%, transparent 65%)" }}
      />
      {/* Bronze glow, lower right */}
      <div
        className="absolute bottom-[-120px] right-[-80px] h-[560px] w-[760px] rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(166,124,61,0.09) 0%, transparent 65%)" }}
      />
      {/* Faint warm lift, center */}
      <div
        className="absolute left-1/2 top-1/3 h-[700px] w-[1000px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(232,220,192,0.028) 0%, transparent 60%)" }}
      />

      {/* Giant faded star watermark, left */}
      <Star
        className="absolute -left-40 top-[22%] h-[620px] w-[620px] fill-bronze text-bronze opacity-[0.055]"
      />
      {/* Second star, small, lower right */}
      <Star
        className="absolute bottom-[8%] right-[4%] h-[220px] w-[220px] fill-blood text-blood opacity-[0.05]"
      />

      {/* Redacted document fragment, upper right */}
      <div className="absolute right-[5%] top-[14%] hidden w-60 rotate-6 border border-bronze/25 bg-panel/80 p-5 md:block">
        <p className="font-type text-[10px] font-bold uppercase tracking-[0.24em] text-bronze/50">
          Exhibit A
        </p>
        <div className="mt-3 space-y-2">
          {[92, 78, 85, 60, 82, 70].map((w, i) => (
            <div
              key={i}
              className="h-1.5 bg-faded/25"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
        <div className="mt-3 inline-block -rotate-3 border-2 border-blood/40 px-2 py-0.5 font-type text-[10px] font-bold uppercase tracking-[0.2em] text-blood/50">
          Reviewed
        </div>
      </div>

      {/* Rubber-stamp watermark, lower left */}
      <div className="absolute bottom-[10%] left-[3%] hidden -rotate-12 rounded border-[3px] border-blood/25 px-8 py-3 font-type text-3xl font-bold uppercase tracking-[0.32em] text-blood/20 lg:block">
        Never twice
      </div>

      {/* Faint bronze schematic traces across the page */}
      <CircuitArtwork
        opacity={0.07}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
