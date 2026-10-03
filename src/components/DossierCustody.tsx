"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import {
  exportDossierSnapshot,
  validateDossierImport,
  importDossierSnapshot,
} from "@/engine/exam-engine";

function dossierFileName(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `nevertwice-dossier-${y}${m}${d}.json`;
}

/**
 * DOSSIER CUSTODY — local export/import for the three persistent keys
 * (weakness + sessions + last-detail). The transient active-drill key is
 * never exported. No backend: a JSON download out, a file picker back in.
 *
 * CustodyBody is the bare control block (no card frame) so DOSSIER ADMIN
 * can compose meter + custody in ONE card. DossierCustody keeps the
 * standalone framed section.
 */
export function CustodyBody() {
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function onExport(): void {
    try {
      const snapshot = exportDossierSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = dossierFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus({ kind: "ok", text: `Filed ${a.download} — keep it somewhere safe.` });
    } catch {
      setStatus({ kind: "err", text: "Export failed — the browser refused the download." });
    }
  }

  function onPickFile(): void {
    fileRef.current?.click();
  }

  function onFileChosen(files: FileList | null): void {
    const file = files?.[0];
    if (!file) return;
    // Reset so the same file can be picked twice in a row.
    if (fileRef.current) fileRef.current.value = "";
    const reader = new FileReader();
    reader.onerror = () => {
      setStatus({ kind: "err", text: "Import rejected — could not read that file." });
    };
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result ?? ""));
        const checked = validateDossierImport(parsed);
        if (!checked.ok) {
          setStatus({ kind: "err", text: `Import rejected — ${checked.error}` });
          return;
        }
        importDossierSnapshot(checked.data);
        setStatus({ kind: "ok", text: "Dossier restored — reloading the board…" });
        window.setTimeout(() => window.location.reload(), 450);
      } catch {
        setStatus({ kind: "err", text: "Import rejected — that file is not valid JSON." });
      }
    };
    reader.readAsText(file);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onExport} className="btn-secondary flex items-center justify-center gap-2 text-sm">
          <Download className="h-4 w-4" aria-hidden="true" />
          EXPORT DOSSIER
        </button>
        <button onClick={onPickFile} className="btn-secondary flex items-center justify-center gap-2 text-sm">
          <Upload className="h-4 w-4" aria-hidden="true" />
          IMPORT DOSSIER
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import dossier file"
        onChange={(e) => onFileChosen(e.target.files)}
      />
      {status && (
        <p
          role={status.kind === "err" ? "alert" : "status"}
          className={`mt-3 font-type text-xs leading-relaxed ${status.kind === "err" ? "text-blood" : "text-olive"}`}
        >
          {status.text}
        </p>
      )}
      <p className="mt-3 font-type text-xs leading-relaxed text-faded">
        Filed locally in this browser — export to keep it safe.
      </p>
    </>
  );
}

export function DossierCustody() {
  return (
    <section aria-label="Dossier custody" className="card">
      <h2 className="font-display text-2xl tracking-wide text-parchment">DOSSIER CUSTODY</h2>
      <p className="mt-1 font-type text-xs tracking-widest text-faded">
        YOUR RECORD • KEEP IT SAFE
      </p>
      <div className="mt-4">
        <CustodyBody />
      </div>
    </section>
  );
}
