"use client";

import { useEffect, useState } from "react";
import { getCoverageCount } from "@/engine/exposure";
import { nustSeedQuestions } from "@/config/exams/nust";

const BANK_IDS = nustSeedQuestions.map((q) => q.id);
const BANK_SIZE = BANK_IDS.length;

/**
 * DOSSIER COMPLETENESS — distinct bank questions ever dealt (timesSeen > 0)
 * over the full bank. Refreshes on mount, on storage events, and when the
 * tab regains focus (e.g. returning from a session).
 *
 * CoverageMeterBody is the bare meter (no card frame) so DOSSIER ADMIN can
 * compose meter + custody in ONE card. BankCoverage keeps the standalone
 * framed section.
 */
export function CoverageMeterBody() {
  const [covered, setCovered] = useState(0);

  useEffect(() => {
    const refresh = () => setCovered(getCoverageCount(BANK_IDS));
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const pct = BANK_SIZE > 0 ? Math.round((covered / BANK_SIZE) * 100) : 0;

  return (
    <>
      <p className="label">BANK COVERAGE</p>
      <p className="font-display mt-1 text-2xl tracking-wide text-parchment">
        DOSSIER COMPLETENESS: {covered}/{BANK_SIZE} FILED
      </p>
      <div
        className="bronze-frame mt-3 h-2 overflow-hidden bg-night"
        role="progressbar"
        aria-valuenow={covered}
        aria-valuemin={0}
        aria-valuemax={BANK_SIZE}
        aria-label={`Dossier completeness ${covered} of ${BANK_SIZE}`}
      >
        <div className="h-full bg-olive transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 font-type text-xs tracking-widest text-faded">{pct}% OF THE BANK SEEN</p>
    </>
  );
}

export function BankCoverage() {
  return (
    <section aria-label="Dossier completeness" className="card">
      <CoverageMeterBody />
    </section>
  );
}
