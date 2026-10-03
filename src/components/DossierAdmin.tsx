"use client";

import { CoverageMeterBody } from "@/components/BankCoverage";
import { CustodyBody } from "@/components/DossierCustody";

/**
 * DOSSIER ADMIN — one card for the two back-office blocks: the
 * completeness meter on top, export/import custody below. Same behaviors
 * as the former two cards, half the chrome.
 */
export function DossierAdmin() {
  return (
    <section aria-label="Dossier admin" className="card">
      <h2 className="font-display text-2xl tracking-wide text-parchment">DOSSIER ADMIN</h2>
      <div className="mt-3">
        <CoverageMeterBody />
      </div>
      <div className="dossier-line my-4" aria-hidden="true" />
      <div>
        <CustodyBody />
      </div>
    </section>
  );
}
