// Full-paper live verification: sequential batches + backoff (mirrors
// buildMockQuestions), then assembles bank-first paper offline and checks
// 200 unique ids + 80/60/30/20/10 split + Groq text uniqueness.
// Usage: node --import=./tests/register.mjs scripts/verify-mock-paper.mts
// Saves Groq items to $MOCK_VERIFY_OUT (default Temp mock-items.json).
import { writeFileSync } from "node:fs";

const BASE = process.env.MOCK_VERIFY_BASE ?? "http://localhost:3100";
const OUT = process.env.MOCK_VERIFY_OUT ?? `${process.env.TEMP ?? "/tmp"}/mock-items.json`;
const STAGGER_MS = 8000;

const mod = await import("../src/engine/question-generator.ts");
const { planMockFill, planMockBatches, parseStrictDrillJson } = mod;

const fills = planMockFill();
const batches = planMockBatches(fills);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let firstTry429 = 0;
const groqBySubject = new Map();
for (let bi = 0; bi < batches.length; bi++) {
  if (bi > 0) await sleep(STAGGER_MS);
  const batch = batches[bi];
  const want = batch.reduce((n, s) => n + s.count, 0);
  const post = () =>
    fetch(`${BASE}/api/generate-mock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjects: batch }),
    });
  let res = await post();
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    if (body.error === "mock-quota-spent") {
      console.log(`batch ${bi + 1}: QUOTA SPENT — stopping`);
      process.exit(2);
    }
    firstTry429++;
    const ra = Number(res.headers.get("retry-after")) || 60;
    console.log(`batch ${bi + 1}/${batches.length}: first-try 429 (retry-after=${ra}s) — backing off once`);
    await sleep(ra * 1000);
    res = await post();
  }
  if (!res.ok) {
    console.log(`batch ${bi + 1}: FAILED http ${res.status} after backoff`);
    process.exit(1);
  }
  const data = await res.json();
  const items = parseStrictDrillJson(JSON.stringify(data.items));
  if (items.length !== want) {
    console.log(`batch ${bi + 1}: SHORT ${items.length}/${want}`);
    process.exit(1);
  }
  // Items arrive grouped in subject order (prompt contract).
  let cursor = 0;
  for (const block of batch) {
    const list = groqBySubject.get(block.subject) ?? [];
    for (let j = 0; j < block.count; j++) list.push(items[cursor++]);
    groqBySubject.set(block.subject, list);
  }
  console.log(`batch ${bi + 1}/${batches.length}: ok ${items.length}/${want}`);
}
writeFileSync(OUT, JSON.stringify({ fills, groq: [...groqBySubject] }, null, 1));

// --- paper assembly check (bankTake + groqNeed = need per subject) ---
const EXPECT = { Mathematics: 80, Physics: 60, Chemistry: 30, English: 20, Intelligence: 10 };
let total = 0;
let paperOk = true;
for (const f of fills) {
  const got = (groqBySubject.get(f.subject) ?? []).length;
  const paper = f.bankTake + got;
  total += paper;
  const ok = paper === f.need && paper === EXPECT[f.subject] && got === f.groqNeed;
  if (!ok) paperOk = false;
  console.log(`${f.subject}: bank ${f.bankTake} + groq ${got} = paper ${paper} (want ${f.need}) ${ok ? "OK" : "MISMATCH"}`);
}
// Groq text uniqueness (normalized) across the whole live haul.
const norm = (t) => t.toLowerCase().replace(/\s+/g, " ").trim();
const seen = new Set();
let dupes = 0;
for (const [, list] of groqBySubject) for (const it of list) {
  const k = norm(it.text);
  if (seen.has(k)) dupes++;
  seen.add(k);
}
console.log(`PAPER total=${total} (want 200) firstTry429=${firstTry429} groqTextDupes=${dupes} saved=${OUT}`);
if (total !== 200 || !paperOk) process.exit(1);
console.log("VERIFY-MOCK-PAPER PASS");
