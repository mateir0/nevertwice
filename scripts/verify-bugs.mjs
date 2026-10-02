// Self-contained verification of Prompt 8 bug fixes.
// The runtime logic under test (getQuestionsForSession, shuffleOptions,
// nustSeedQuestions) is inlined here verbatim from the source files so the
// check runs against the actual implemented algorithms, not a cached build.
//
// Reporting rules (from the prompt):
//  (a) getQuestionsForSession(20) x 10 runs — zero duplicate question texts
//      inside any single session. Report the real number.
//  (b) correctIndex over 200 shuffled questions — each of A/B/C/D in
//      20–30%. Report the real counts/percentages.

// ---------------------------------------------------------------------------
// Inlined from src/config/exams/nust.ts
// ---------------------------------------------------------------------------

const nustSeedQuestions = [
  { id: "nust-seed-1", section: "Mathematics", topic: "Algebra", subtopic: "Quadratic Equations", text: "Stand-in drill Q1 — Practice drill: if x^2 - 5x + 6 = 0, the roots are?", options: ["x = 2, 3", "x = 1, 6", "x = -2, -3", "x = 0, 5"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-2", section: "Mathematics", topic: "Algebra", subtopic: "Sequences & Series", text: "Stand-in drill Q2 — Practice drill: the 5th term of 2, 6, 18, ... is?", options: ["54", "162", "486", "108"], correctIndex: 1, isPlaceholder: true },
  { id: "nust-seed-3", section: "Mathematics", topic: "Calculus", subtopic: "Differentiation", text: "Stand-in drill Q3 — Practice drill: d/dx (x^3) equals?", options: ["3x^2", "x^2", "3x", "x^3 / 3"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-4", section: "Mathematics", topic: "Calculus", subtopic: "Integration", text: "Stand-in drill Q4 — Practice drill: integral of 2x dx equals?", options: ["x^2 + C", "2 + C", "x + C", "2x^2 + C"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-5", section: "Mathematics", topic: "Trigonometry", subtopic: "Identities", text: "Stand-in drill Q5 — Practice drill: sin^2(x) + cos^2(x) equals?", options: ["1", "0", "2", "tan(x)"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-6", section: "Physics", topic: "Mechanics", subtopic: "Kinematics", text: "Stand-in drill Q6 — Practice drill: a body at rest accelerates at 2 m/s^2 for 3 s. Final velocity?", options: ["6 m/s", "3 m/s", "9 m/s", "12 m/s"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-7", section: "Physics", topic: "Mechanics", subtopic: "Newton Laws", text: "Stand-in drill Q7 — Practice drill: a 2 kg mass under 10 N net force accelerates at?", options: ["5 m/s^2", "20 m/s^2", "2 m/s^2", "0.2 m/s^2"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-8", section: "Physics", topic: "Mechanics", subtopic: "Work Energy Power", text: "Stand-in drill Q8 — Practice drill: 100 J of work in 20 s is what power?", options: ["5 W", "2000 W", "120 W", "80 W"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-9", section: "Physics", topic: "Electromagnetism", subtopic: "Electrostatics", text: "Stand-in drill Q9 — Practice drill: like charges do what?", options: ["Repel", "Attract", "Cancel", "Nothing"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-10", section: "Physics", topic: "Electromagnetism", subtopic: "Current Electricity", text: "Stand-in drill Q10 — Practice drill: V = 12 V, R = 4 ohm. Current?", options: ["3 A", "48 A", "8 A", "16 A"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-11", section: "Chemistry", topic: "Physical Chemistry", subtopic: "Atomic Structure", text: "Stand-in drill Q11 — Practice drill: electrons were discovered via?", options: ["Cathode rays", "Alpha scattering", "Photoelectric effect", "X-ray diffraction"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-12", section: "Chemistry", topic: "Physical Chemistry", subtopic: "Chemical Bonding", text: "Stand-in drill Q12 — Practice drill: NaCl is held by which bond?", options: ["Ionic", "Covalent", "Metallic", "Hydrogen"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-13", section: "Chemistry", topic: "Organic Chemistry", subtopic: "Hydrocarbons", text: "Stand-in drill Q13 — Practice drill: methane has which geometry?", options: ["Tetrahedral", "Linear", "Planar", "Pyramidal"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-14", section: "Chemistry", topic: "Inorganic Chemistry", subtopic: "Periodic Properties", text: "Stand-in drill Q14 — Practice drill: most electronegative element?", options: ["Fluorine", "Oxygen", "Chlorine", "Sodium"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-15", section: "English", topic: "Grammar", subtopic: "Tenses", text: "Stand-in drill Q15 — Practice drill: choose the correct sentence.", options: ["She goes to school daily.", "She go to school daily.", "She going to school daily.", "She gone to school daily."], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-16", section: "English", topic: "Vocabulary", subtopic: "Synonyms", text: "Stand-in drill Q16 — Practice drill: pick the synonym of RAPID.", options: ["Fast", "Slow", "Quiet", "Heavy"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-17", section: "English", topic: "Comprehension", subtopic: "Inference", text: "Stand-in drill Q17 — Practice drill: 'He arrived drenched.' What can be inferred?", options: ["It was raining.", "He was swimming.", "He spilled water.", "He was crying."], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-18", section: "Intelligence", topic: "Logical Reasoning", subtopic: "Series", text: "Stand-in drill Q18 — Practice drill: next in 3, 6, 12, 24, ...?", options: ["48", "36", "30", "42"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-19", section: "Intelligence", topic: "Logical Reasoning", subtopic: "Analogies", text: "Stand-in drill Q19 — Practice drill: Book is to Reading as Pen is to?", options: ["Writing", "Drawing only", "Eating", "Sleeping"], correctIndex: 0, isPlaceholder: true },
  { id: "nust-seed-20", section: "Intelligence", topic: "Non-Verbal", subtopic: "Pattern Completion", text: "Stand-in drill Q20 — Practice drill: a square rotated 90 degrees still looks like?", options: ["A square", "A triangle", "A circle", "A line"], correctIndex: 0, isPlaceholder: true },
];

// Inlined verbatim from src/config/exams/nust.ts:getQuestionsForSession
// (after the Prompt-8 fix: Fisher-Yates bank shuffle + take first n, then
// shuffleOptions on every returned question).
function getQuestionsForSession(count = 20) {
  const pool = [...nustSeedQuestions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  const selected = pool.slice(0, Math.min(count, pool.length));
  return selected.map(shuffleOptions);
}

// ---------------------------------------------------------------------------
// Inlined from src/engine/question-generator.ts:shuffleOptions (after fix)
// ---------------------------------------------------------------------------
function shuffleOptions(question) {
  const options = [...question.options];
  let j;
  let tmp;
  for (let i = options.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    tmp = options[i];
    options[i] = options[j];
    options[j] = tmp;
  }
  const correctIndex = options.indexOf(question.options[question.correctIndex]);
  return Object.assign({}, question, { options, correctIndex });
}

// ---------------------------------------------------------------------------
// (a) Session dedup check
// ---------------------------------------------------------------------------
const SESSION_RUNS = 10;
const SESSION_N = 20;
const bankSize = nustSeedQuestions.length;

let sessionFailures = 0;
const perRunDups = [];

for (let run = 0; run < SESSION_RUNS; run++) {
  const qs = getQuestionsForSession(SESSION_N);
  const seen = new Set();
  let dupInRun = false;
  for (const q of qs) {
    const key = q.text.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) {
      dupInRun = true;
      console.log(`[SESSION FAIL] run ${run + 1}: duplicate text:\n  "${q.text}"`);
    }
    seen.add(key);
  }
  perRunDups.push(dupInRun);
  if (dupInRun) sessionFailures++;
  if (qs.length > bankSize) {
    console.log(`[SESSION FAIL] run ${run + 1}: got ${qs.length} questions but bank has ${bankSize}`);
    sessionFailures++;
  }
}

console.log(`\n== (a) getQuestionsForSession(${SESSION_N}) x ${SESSION_RUNS} runs ==`);
console.log(`bank size: ${bankSize}`);
console.log(`sessions with >=1 duplicate text: ${sessionFailures} out of ${SESSION_RUNS}`);
console.log(`per-run duplicate flags: [${perRunDups.map(Boolean).join(", ")}]`);
if (sessionFailures === 0) {
  console.log(`RESULT (a): 0 duplicate-question sessions out of ${SESSION_RUNS}. PASS`);
} else {
  console.log(`RESULT (a): ${sessionFailures} failure(s) out of ${SESSION_RUNS}. FAIL`);
}

// ---------------------------------------------------------------------------
// (b) correctIndex distribution over 200 shuffled questions
// ---------------------------------------------------------------------------
const SHUFFLED_N = 200;
const buckets = { 0: 0, 1: 0, 2: 0, 3: 0 };

for (let i = 0; i < SHUFFLED_N; i += bankSize) {
  const batch = getQuestionsForSession(Math.min(SESSION_N, SHUFFLED_N - i));
  for (const q of batch) {
    buckets[q.correctIndex] = (buckets[q.correctIndex] ?? 0) + 1;
  }
}

console.log(`\n== (b) correctIndex over ${SHUFFLED_N} shuffled questions ==`);
const total = buckets[0] + buckets[1] + buckets[2] + buckets[3];
console.log(`counts: { A: ${buckets[0]}, B: ${buckets[1]}, C: ${buckets[2]}, D: ${buckets[3]} }`);
console.log(`total : ${total}`);

const letters = ["A", "B", "C", "D"];
let distFail = false;
for (const idx of [0, 1, 2, 3]) {
  const pct = (buckets[idx] / total) * 100;
  const ok = pct >= 20 && pct <= 30;
  if (!ok) distFail = true;
  console.log(`  ${letters[idx]}: ${buckets[idx]} (${pct.toFixed(2)}%)  ${ok ? "OK" : "OUT OF 20-30% RANGE"}`);
}

if (!distFail) {
  console.log(`RESULT (b): all four positions within 20-30%. PASS`);
} else {
  console.log(`RESULT (b): at least one position outside 20-30%. FAIL`);
}

// ---------------------------------------------------------------------------
// (c) Monte Carlo sanity on shuffleOptions itself (10k trials, single seed q)
// ---------------------------------------------------------------------------
console.log(`\n== (c) shuffleOptions Monte Carlo: 10000 shuffles of seed Q1 ==`);
const sampleQ = nustSeedQuestions[0];
const mcBuckets = { 0: 0, 1: 0, 2: 0, 3: 0 };
const N_MC = 10000;
for (let i = 0; i < N_MC; i++) {
  const sh = shuffleOptions(sampleQ);
  mcBuckets[sh.correctIndex] = (mcBuckets[sh.correctIndex] ?? 0) + 1;
}
console.log(`counts: { A: ${mcBuckets[0]}, B: ${mcBuckets[1]}, C: ${mcBuckets[2]}, D: ${mcBuckets[3]} }`);
for (const idx of [0, 1, 2, 3]) {
  console.log(`  ${letters[idx]}: ${mcBuckets[idx]} (${((mcBuckets[idx] / N_MC) * 100).toFixed(2)}%)`);
}
