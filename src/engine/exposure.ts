/**
 * All-time bank exposure: { questionId: timesSeen }.
 *
 * Complements the recency list (last-3-sessions IDs in nust.ts): recency
 * keeps consecutive sessions fresh, exposure weights the whole bank so
 * never-seen questions surface first and the dossier meter can report
 * completeness. Never throws; degrades to "no exposure" outside the
 * browser or when storage is unavailable.
 */
export const EXPOSURE_KEY = "nevertwice-exposure";

export type ExposureMap = Record<string, number>;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Raw all-time exposure map. Empty outside the browser. */
export function getExposure(): ExposureMap {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(EXPOSURE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: ExposureMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) out[k] = Math.floor(v);
    }
    return out;
  } catch {
    return {};
  }
}

/** timesSeen for one id, 0 when never dealt. */
export function timesSeen(questionId: string): number {
  return getExposure()[questionId] ?? 0;
}

/**
 * Increment timesSeen once per dealt id. Call exactly once per deal —
 * callers own StrictMode double-fire protection (deal-once refs for sync
 * deals, shared in-flight promise for the async drill pipeline).
 */
export function recordExposureIds(ids: string[]): void {
  if (!isBrowser() || ids.length === 0) return;
  try {
    const map = getExposure();
    for (const id of ids) {
      if (typeof id !== "string" || id.length === 0) continue;
      map[id] = (map[id] ?? 0) + 1;
    }
    localStorage.setItem(EXPOSURE_KEY, JSON.stringify(map));
  } catch {
    // storage full / private mode — ignore (coverage degrades, app works)
  }
}

/** Distinct bank ids with timesSeen > 0 — the dossier-completeness numerator. */
export function getCoverageCount(bankIds: string[]): number {
  const map = getExposure();
  let n = 0;
  for (const id of bankIds) {
    if ((map[id] ?? 0) > 0) n += 1;
  }
  return n;
}
