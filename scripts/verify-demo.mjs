// One-shot VERIFY demonstration for the v2 audit pass. Prints real numbers
// IN WRITING: statistics + behavior demos (a)-(d). Run with:
//   node --import=./tests/register.mjs scripts/verify-demo.mjs
import { buildDrillFallback, buildDrillQuestions, shuffleOptions } from "../src/engine/question-generator.ts";
import { ExamEngine, TIMEOUT_ANSWER, mistakesFromAnswers, nodeKey } from "../src/engine/exam-engine.ts";
import { getQuestionsForSession, nustSeedQuestions } from "../src/config/exams/nust.ts";

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

const store = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => void store.clear(),
};
globalThis.fetch = async () => {
  throw new Error("groq unreachable (simulates unset key / offline)");
};

// ---- statistics: 10 sessions x 20, zero dup stems inside any session ----
let dupSessions = 0;
for (let s = 0; s < 10; s++) {
  const qs = getQuestionsForSession(20);
  const stems = new Set(qs.map((q) => norm(q.text)));
  if (stems.size !== qs.length) dupSessions += 1;
}
console.log(`STAT sessions: 10 sessions x 20 questions -> sessions with a duplicate stem: ${dupSessions}/10`);
store.clear();

// ---- statistics: correctIndex over 200 shuffles (REAL randomness) ----
const buckets = [0, 0, 0, 0];
for (let i = 0; i < 200; i++) {
  buckets[shuffleOptions(nustSeedQuestions[i % nustSeedQuestions.length]).correctIndex] += 1;
}
const pcts = buckets.map((c) => ((c / 200) * 100).toFixed(1));
console.log(`STAT shuffle: 200 shuffles -> A:${buckets[0]} (${pcts[0]}%) B:${buckets[1]} (${pcts[1]}%) C:${buckets[2]} (${pcts[2]}%) D:${buckets[3]} (${pcts[3]}%)`);
console.log(`STAT shuffle: all in 20-30%: ${buckets.every((c) => c >= 40 && c <= 60)}`);
store.clear();

// ---- (a) GROQ unset/unreachable -> instant fallback ----
{
  const t0 = Date.now();
  const out = await buildDrillQuestions([
    { topic: "Calculus", subtopic: "Differentiation", errorType: "concept-gap", count: 4 },
    { topic: "Algebra", subtopic: "Quadratic Equations", errorType: "formula-error", count: 4 },
  ]);
  const dt = Date.now() - t0;
  const bankTexts = new Set(nustSeedQuestions.map((q) => norm(q.text)));
  const allBank = out.every((q) => bankTexts.has(norm(q.text)));
  console.log(`DEMO (a): groq unreachable -> ${out.length} questions in ${dt}ms, all from fallback bank: ${allBank}`);
}
store.clear();

// ---- (b) timer expiry -> time-pressure mistake, auto-advance data ----
{
  const qs = getQuestionsForSession(3);
  const answers = [TIMEOUT_ANSWER, null, null]; // Q1 timed out, rest untouched
  const { correct, mistakes } = mistakesFromAnswers(qs, answers, [null, null, null], "demo", Date.now());
  console.log(`DEMO (b): answers=[-1,null,null] -> correct=${correct}, mistakes=${mistakes.length}, errorType=${mistakes[0]?.errorType}`);
  console.log(`DEMO (b): nulls are skips (not mistakes): ${mistakes.length === 1}`);
}
store.clear();

// ---- (c) Differentiation-only session leaves other faults unchanged ----
{
  store.set("nevertwice-weakness", JSON.stringify([
    { topic: "Calculus", subtopic: "Differentiation", mistakeCount: 3, lastSeen: 1000, trend: "rising" },
    { topic: "Physical Chemistry", subtopic: "Atomic Structure", mistakeCount: 2, lastSeen: 1000, trend: "rising" },
  ]));
  const now = Date.now();
  const before = ExamEngine.getWeaknessNodes().map((n) => `${n.subtopic}:${n.mistakeCount}`).join(", ");
  const { nodes } = ExamEngine.recordSession({
    id: "demo", date: now, questionsAttempted: 2, correct: 1,
    mistakes: [{ id: "m", questionId: "q", topic: "Calculus", subtopic: "Differentiation", errorType: "concept-gap", timestamp: now, sessionId: "demo" }],
    durationSeconds: 60,
    attemptedKeys: [nodeKey("Calculus", "Differentiation")],
  });
  const after = nodes.map((n) => `${n.subtopic}:${n.mistakeCount}`).join(", ");
  console.log(`DEMO (c): before=[${before}] after=[${after}] (Atomic Structure untouched: ${nodes.find((n) => n.subtopic === "Atomic Structure").mistakeCount === 2})`);
}
store.clear();

// ---- (d) fallback never emits a number-varied stem ----
{
  const bankTexts = new Set(nustSeedQuestions.map((q) => norm(q.text)));
  const seedShapes = new Set(nustSeedQuestions.map((q) => norm(q.text).replace(/[0-9]/g, "#")));
  const stripDigits = (s) => norm(s).replace(/[0-9]/g, "#");
  let checked = 0;
  let digitOnlyVariants = 0;
  const topicPairs = [["Calculus", "Differentiation"], ["Algebra", "Quadratic Equations"], ["Mechanics", "Kinematics"], ["Grammar", "Tenses"]];
  for (let r = 0; r < 50; r++) {
    const [topic, subtopic] = topicPairs[r % topicPairs.length];
    const out = buildDrillFallback([{ topic, subtopic, errorType: "concept-gap", count: 8 }]);
    for (const q of out) {
      checked += 1;
      if (!bankTexts.has(norm(q.text)) && seedShapes.has(stripDigits(q.text))) {
        digitOnlyVariants += 1;
        console.log(`  VARIANT: ${q.text}`);
      }
    }
  }
  console.log(`DEMO (d): ${checked} fallback stems checked, differing-from-seed-only-by-digits: ${digitOnlyVariants} (expect 0)`);
}
