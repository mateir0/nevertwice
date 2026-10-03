// Behavior tests: drill pipeline, validator, decay scoping, timer-mistake
// fold, and cross-session freshness. Exercises the REAL sources.
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withSeededRandom(seed, fn) {
  const orig = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}

// NOTE: imports below are hoisted, but no engine module touches
// window/localStorage/fetch at load time (all guarded at call time),
// so installing the fakes here is safe.
import {
  assignToSlots,
  buildDrillFallback,
  buildDrillPrompt,
  buildDrillQuestions,
  buildMockPrompt,
  buildMockQuestions,
  MOCK_BATCH_MAX,
  MOCK_SUBJECTS,
  MOCK_TOTAL_QUESTIONS,
  MOCK_TOTAL_SECONDS,
  parseStrictDrillJson,
  planMockBatches,
  planMockFill,
  shuffleOptions,
} from "../src/engine/question-generator.ts";
import { planDrill, planToGenTargets } from "../src/engine/drill-planner.ts";
import {
  ExamEngine,
  TIMEOUT_ANSWER,
  applyMockExpiry,
  exportDossierSnapshot,
  importDossierSnapshot,
  mistakesFromAnswers,
  nodeKey,
  validateDossierImport,
} from "../src/engine/exam-engine.ts";
import {
  EXPOSURE_KEY,
  getCoverageCount,
  getExposure,
  recordExposureIds,
  timesSeen,
} from "../src/engine/exposure.ts";
import {
  getQuestionsForSession,
  getRecentQuestionIds,
  getAllTopics,
  nustSeedQuestions,
} from "../src/config/exams/nust.ts";

const store = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => void store.clear(),
};
globalThis.fetch = async () => {
  throw new Error("no network in tests");
};

beforeEach(() => {
  store.clear();
});

describe("MEDIUM 7 — strict validator enforces distinct options", () => {
  it("rejects items whose options are not all distinct", () => {
    const dup = JSON.stringify([
      { text: "Q?", options: ["A", "A", "B", "C"], correctIndex: 0 },
    ]);
    assert.throws(() => parseStrictDrillJson(dup), /duplicate options/);
    const dupCase = JSON.stringify([
      { text: "Q?", options: ["  fast ", "FAST", "slow", "x"], correctIndex: 0 },
    ]);
    assert.throws(() => parseStrictDrillJson(dupCase), /duplicate options/);
  });

  it("accepts well-formed items and still rejects other violations", () => {
    const ok = JSON.stringify([{ text: "Q?", options: ["A", "B", "C", "D"], correctIndex: 2, explanation: "C is right because the key step applies." }]);
    assert.deepEqual(parseStrictDrillJson(ok), [{ text: "Q?", options: ["A", "B", "C", "D"], correctIndex: 2, explanation: "C is right because the key step applies." }]);
    assert.throws(() => parseStrictDrillJson(JSON.stringify([{ text: "Q?", options: ["A", "B", "C"], correctIndex: 0 }])), /bad options/);
    assert.throws(() => parseStrictDrillJson(JSON.stringify([{ text: "Q?", options: ["A", "B", "C", "D"], correctIndex: 4 }])), /bad correctIndex/);
    assert.throws(() => parseStrictDrillJson("no json here"), /no JSON array/);
  });

  it("rejects missing/empty explanations and accepts a valid one", () => {
    const missing = JSON.stringify([{ text: "Q?", options: ["A", "B", "C", "D"], correctIndex: 1 }]);
    assert.throws(() => parseStrictDrillJson(missing), /bad explanation/);
    const empty = JSON.stringify([{ text: "Q?", options: ["A", "B", "C", "D"], correctIndex: 1, explanation: "   " }]);
    assert.throws(() => parseStrictDrillJson(empty), /bad explanation/);
    const nonString = JSON.stringify([{ text: "Q?", options: ["A", "B", "C", "D"], correctIndex: 1, explanation: 42 }]);
    assert.throws(() => parseStrictDrillJson(nonString), /bad explanation/);
    const ok = JSON.stringify([{ text: "Q?", options: ["A", "B", "C", "D"], correctIndex: 1, explanation: "B is right because of the formula x²." }]);
    assert.deepEqual(parseStrictDrillJson(ok), [
      { text: "Q?", options: ["A", "B", "C", "D"], correctIndex: 1, explanation: "B is right because of the formula x²." },
    ]);
  });
});

describe("CRITICAL 3 — Groq path shuffles + prompt spreads the key", () => {
  it("prompt demands uniform correct-answer positions", () => {
    const p = buildDrillPrompt([{ topic: "Calculus", subtopic: "Differentiation", errorType: "concept-gap", count: 2 }]);
    assert.ok(p.includes("uniformly across positions"), "prompt missing uniform-distribution line");
  });

  it("assignToSlots shuffles every item and keeps the key on the right answer", () => {
    const targets = [{ topic: "Calculus", subtopic: "Differentiation", errorType: "concept-gap", count: 2000 }];
    const gen = Array.from({ length: 2000 }, (_, i) => ({
      text: `Groq Q${i}?`,
      options: ["CORRECT", "W1", "W2", "W3"],
      correctIndex: 0,
      explanation: `Because the key step is ${i}.`,
    }));
    const out = withSeededRandom(7, () => assignToSlots(gen, targets));
    assert.equal(out.length, 2000);
    const buckets = [0, 0, 0, 0];
    for (const q of out) {
      buckets[q.correctIndex] += 1;
      assert.equal(q.options[q.correctIndex], "CORRECT", "key drifted off the answer");
    }
    for (let i = 0; i < 4; i++) {
      const pct = (buckets[i] / 2000) * 100;
      assert.ok(pct >= 20 && pct <= 30, `position ${i}: ${pct.toFixed(2)}% outside 20-30%`);
    }
  });
});

describe("CRITICAL 2 — fallback emits verbatim seeds, never varied stems", () => {
  const bankTexts = new Set(nustSeedQuestions.map((q) => norm(q.text)));
  const bankByText = new Map(nustSeedQuestions.map((q) => [norm(q.text), q]));

  it("every fallback stem is an exact bank stem with its key intact", () => {
    const targets = [{ topic: "Calculus", subtopic: "Differentiation", errorType: "concept-gap", count: 6 }];
    const out = withSeededRandom(11, () => buildDrillFallback(targets));
    assert.equal(out.length, 6);
    for (const q of out) {
      const seed = bankByText.get(norm(q.text));
      assert.ok(seed, `fallback stem not verbatim from bank: ${q.text}`);
      assert.equal(q.options[q.correctIndex], seed.options[seed.correctIndex], "key mismatch on verbatim stem");
    }
  });

  it("zero stems differing from seeds only by digits (the varyStem corruption)", () => {
    const targets = [
      { topic: "Calculus", subtopic: "Differentiation", errorType: "concept-gap", count: 4 },
      { topic: "Algebra", subtopic: "Quadratic Equations", errorType: "formula-error", count: 4 },
    ];
    const out = withSeededRandom(23, () => buildDrillFallback(targets));
    const stripDigits = (s) => norm(s).replace(/[0-9]/g, "#");
    const seedShapes = new Set(nustSeedQuestions.map((q) => stripDigits(q.text)));
    let digitOnlyVariants = 0;
    for (const q of out) {
      if (!bankTexts.has(norm(q.text)) && seedShapes.has(stripDigits(q.text))) digitOnlyVariants += 1;
    }
    assert.equal(digitOnlyVariants, 0);
  });
});

describe("CRITICAL 1 — one async pipeline, fallback instant without Groq", () => {
  it("planDrill scores only (no questions); pages build via buildDrillQuestions", () => {
    store.set(
      "nevertwice-weakness",
      JSON.stringify([{ topic: "Calculus", subtopic: "Differentiation", mistakeCount: 3, lastSeen: Date.now(), trend: "rising" }]),
    );
    store.set("nevertwice-sessions", JSON.stringify([]));
    const plan = planDrill();
    assert.ok(plan, "expected a plan");
    assert.deepEqual(plan.questions, []);
    assert.ok(plan.targets.length > 0 && plan.reason.length > 0);
    for (const t of plan.targets) {
      assert.ok(t.topic && t.subtopic && Number.isInteger(t.count) && t.count >= 1 && t.errorType);
    }
    const gen = planToGenTargets(plan);
    assert.deepEqual(gen.map((g) => [g.topic, g.subtopic, g.errorType, g.count]), plan.targets.map((t) => [t.topic, t.subtopic, t.errorType, t.count]));
  });

  it("planDrill returns null on an empty graph", () => {
    store.set("nevertwice-weakness", JSON.stringify([]));
    assert.equal(planDrill(), null);
  });

  it("drill reason pluralizes the error noun by count", () => {
    const mk = (n) =>
      JSON.stringify(
        Array.from({ length: n }, (_, i) => ({
          id: `m${i}`,
          questionId: `q${i}`,
          topic: "Algebra",
          subtopic: "Quadratic Equations",
          errorType: "concept-gap",
          timestamp: 1000 + i,
          sessionId: "s",
        })),
      );
    store.set(
      "nevertwice-weakness",
      JSON.stringify([{ topic: "Algebra", subtopic: "Quadratic Equations", mistakeCount: 2, lastSeen: Date.now(), trend: "rising" }]),
    );
    store.set("nevertwice-sessions", JSON.stringify([{ id: "s", date: 2000, questionsAttempted: 1, correct: 0, mistakes: JSON.parse(mk(1)), durationSeconds: 60 }]));
    const one = planDrill();
    assert.ok(one.reason.includes("1 concept gap in"), `singular missing: ${one.reason}`);
    assert.ok(!one.reason.includes("gaps"), `plural leaked into singular: ${one.reason}`);
    store.set("nevertwice-sessions", JSON.stringify([{ id: "s", date: 2000, questionsAttempted: 2, correct: 0, mistakes: JSON.parse(mk(2)), durationSeconds: 60 }]));
    const two = planDrill();
    assert.ok(two.reason.includes("2 concept gaps in"), `plural missing: ${two.reason}`);
  });

  it("buildDrillQuestions delivers instantly when Groq is unreachable", async () => {
    const targets = [{ topic: "Calculus", subtopic: "Differentiation", errorType: "concept-gap", count: 6 }];
    const t0 = Date.now();
    const out = await buildDrillQuestions(targets);
    const dt = Date.now() - t0;
    assert.equal(out.length, 6);
    assert.ok(dt < 2000, `fallback took ${dt}ms, expected instant`);
    const bankByText = new Map(nustSeedQuestions.map((q) => [norm(q.text), q]));
    for (const q of out) {
      const seed = bankByText.get(norm(q.text));
      assert.ok(seed, "fallback question not from bank");
      assert.equal(q.options[q.correctIndex], seed.options[seed.correctIndex]);
    }
  });
});

describe("HIGH 4 — decay touches only attempted subtopics", () => {
  const nodes = [
    { topic: "Calculus", subtopic: "Differentiation", mistakeCount: 3, lastSeen: 1000, trend: "rising" },
    { topic: "Physical Chemistry", subtopic: "Atomic Structure", mistakeCount: 2, lastSeen: 1000, trend: "rising" },
  ];

  it("a Differentiation-only session leaves Atomic Structure unchanged", () => {
    store.set("nevertwice-weakness", JSON.stringify(nodes));
    const now = Date.now();
    const { nodes: next } = ExamEngine.recordSession({
      id: "s1",
      date: now,
      questionsAttempted: 3,
      correct: 2,
      mistakes: [
        { id: "m1", questionId: "q1", topic: "Calculus", subtopic: "Differentiation", errorType: "concept-gap", timestamp: now, sessionId: "s1" },
      ],
      durationSeconds: 60,
      attemptedKeys: [nodeKey("Calculus", "Differentiation")],
    });
    const diff = next.find((n) => n.subtopic === "Differentiation");
    const atomic = next.find((n) => n.subtopic === "Atomic Structure");
    assert.equal(diff.mistakeCount, 4);
    assert.equal(atomic.mistakeCount, 2, "untouched topic decayed");
    assert.equal(atomic.trend, "stable");
  });

  it("attempted-but-clean subtopics still decay", () => {
    store.set("nevertwice-weakness", JSON.stringify(nodes));
    const now = Date.now();
    const { nodes: next } = ExamEngine.recordSession({
      id: "s2",
      date: now,
      questionsAttempted: 3,
      correct: 3,
      mistakes: [],
      durationSeconds: 60,
      attemptedKeys: [nodeKey("Calculus", "Differentiation")],
    });
    const diff = next.find((n) => n.subtopic === "Differentiation");
    const atomic = next.find((n) => n.subtopic === "Atomic Structure");
    assert.equal(diff.mistakeCount, 2);
    assert.equal(diff.trend, "falling");
    assert.equal(atomic.mistakeCount, 2, "untouched topic decayed");
  });

  it("legacy sessions without attemptedKeys skip decay", () => {
    store.set("nevertwice-weakness", JSON.stringify(nodes));
    const now = Date.now();
    const { nodes: next } = ExamEngine.recordSession({
      id: "s3",
      date: now,
      questionsAttempted: 3,
      correct: 3,
      mistakes: [],
      durationSeconds: 60,
    });
    const diff = next.find((n) => n.subtopic === "Differentiation");
    assert.equal(diff.mistakeCount, 3, "legacy session decayed a node");
    assert.equal(diff.trend, "stable");
  });
});

describe("HIGH 5 — timeout folds to a time-pressure mistake, never a skip", () => {
  const qs = [
    { id: "q1", section: "Mathematics", topic: "Calculus", subtopic: "Differentiation", text: "Q1", options: ["A", "B", "C", "D"], correctIndex: 1, isPlaceholder: false },
    { id: "q2", section: "Mathematics", topic: "Calculus", subtopic: "Differentiation", text: "Q2", options: ["A", "B", "C", "D"], correctIndex: 0, isPlaceholder: false },
    { id: "q3", section: "Mathematics", topic: "Calculus", subtopic: "Differentiation", text: "Q3", options: ["A", "B", "C", "D"], correctIndex: 2, isPlaceholder: false },
  ];

  it("sentinel -1 becomes a time-pressure mistake; null stays a skip", () => {
    const { correct, mistakes } = mistakesFromAnswers(qs, [TIMEOUT_ANSWER, null, 2], [null, null, null], "s", 999);
    assert.equal(correct, 1);
    assert.equal(mistakes.length, 1);
    assert.equal(mistakes[0].errorType, "time-pressure");
    assert.equal(mistakes[0].questionId, "q1");
  });

  it("wrong answers keep the user classification", () => {
    const { correct, mistakes } = mistakesFromAnswers(qs, [0, null, null], ["misread", null, null], "s", 999);
    assert.equal(correct, 0);
    assert.equal(mistakes.length, 1);
    assert.equal(mistakes[0].errorType, "misread");
  });
});

describe("HIGH 6 — session freshness across the last 3 sessions", () => {
  it("5 sessions x 20: no in-session dup stems; zero overlap with the previous 3 sessions", () => {
    const dealt = [];
    for (let s = 0; s < 5; s++) {
      const qs = getQuestionsForSession(20);
      assert.equal(qs.length, 20);
      const stems = new Set(qs.map((q) => norm(q.text)));
      assert.equal(stems.size, 20, `session ${s}: duplicate stems inside session`);
      dealt.push(qs.map((q) => q.id));
    }
    for (let i = 0; i < dealt.length; i++) {
      const cur = new Set(dealt[i]);
      for (let j = Math.max(0, i - 3); j < i; j++) {
        const overlap = dealt[j].filter((id) => cur.has(id));
        assert.deepEqual(overlap, [], `session ${i} repeats ${overlap.length} question(s) from session ${j}`);
      }
    }
    assert.ok(getRecentQuestionIds().length <= 60, "recent-ID list exceeds 3 sessions");
  });
});

describe("statistics — 10 sessions x 20 dup-free; 200-shuffle key spread", () => {
  it("zero duplicate stems inside any of 10 sessions", () => {
    for (let s = 0; s < 10; s++) {
      const qs = getQuestionsForSession(20);
      const stems = new Set(qs.map((q) => norm(q.text)));
      assert.equal(stems.size, qs.length, `session ${s} has duplicates`);
    }
  });

  it("correctIndex over 200 shuffles lands A/B/C/D in 20-30%", () => {
    const buckets = [0, 0, 0, 0];
    withSeededRandom(20261002, () => {
      for (let i = 0; i < 200; i++) {
        const q = nustSeedQuestions[i % nustSeedQuestions.length];
        buckets[shuffleOptions(q).correctIndex] += 1;
      }
    });
    for (let i = 0; i < 4; i++) {
      const pct = (buckets[i] / 200) * 100;
      assert.ok(pct >= 20 && pct <= 30, `position ${i}: ${pct.toFixed(1)}% outside 20-30%`);
    }
  });
});

describe("topic/subtopic pair atomicity — builders can never emit a mismatched pair", () => {
  it("every fallback and Groq-slot question carries a taxonomy-valid pair", () => {
    const valid = new Set(getAllTopics().map((t) => `${t.topic}::${t.subtopic}`));
    for (const t of getAllTopics()) {
      const fb = buildDrillFallback([{ topic: t.topic, subtopic: t.subtopic, errorType: "concept-gap", count: 2 }]);
      for (const q of fb) {
        assert.ok(valid.has(`${q.topic}::${q.subtopic}`), `fallback mismatch: ${q.topic} / ${q.subtopic}`);
      }
      const slots = assignToSlots(
        [
          { text: "G1?", options: ["A", "B", "C", "D"], correctIndex: 0, explanation: "Because A." },
          { text: "G2?", options: ["A", "B", "C", "D"], correctIndex: 1, explanation: "Because B." },
        ],
        [{ topic: t.topic, subtopic: t.subtopic, errorType: "concept-gap", count: 2 }],
      );
      for (const q of slots) {
        assert.ok(valid.has(`${q.topic}::${q.subtopic}`), `slot mismatch: ${q.topic} / ${q.subtopic}`);
      }
    }
  });
});

describe("wiring — dead code stays dead-code-free", () => {
  const root = path.resolve(process.cwd());
  const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

  it("question-generator has no varyStem/perturbStem", () => {
    const src = read("src/engine/question-generator.ts");
    assert.ok(!src.includes("varyStem"), "varyStem still present");
    assert.ok(!src.includes("perturbStem"), "perturbStem still present");
  });

  it("session page files timeouts as time-pressure and auto-advances", () => {
    const src = read("src/app/session/page.tsx");
    assert.ok(src.includes("TIMEOUT_ANSWER"), "no timeout sentinel");
    assert.ok(src.includes("mistakesFromAnswers"), "finish bypasses the shared fold");
    assert.ok(src.includes("attemptedKeys"), "session omits attemptedKeys");
    assert.ok(src.includes("time-pressure"), "no time-pressure filing");
  });

  it("/app and /results both use the single async pipeline with loading states", () => {
    for (const p of ["src/app/app/page.tsx", "src/app/results/page.tsx"]) {
      const src = read(p);
      assert.ok(src.includes("buildDrillQuestions"), `${p}: pipeline not called`);
      assert.ok(src.includes("GENERATING DRILL"), `${p}: no generating state`);
      assert.ok(!src.includes("buildDrillFallback"), `${p}: still calls fallback directly`);
    }
  });

  it("GROQ_MODEL untouched", () => {
    const src = read("src/app/api/generate-drill/route.ts");
    assert.ok(src.includes('const GROQ_MODEL = "openai/gpt-oss-120b"'), "GROQ_MODEL changed");
  });
});

describe("GAP 1 — dossier custody (export / import, no backend)", () => {
  it("export → validate → import round-trips the three keys", () => {
    store.set(
      "nevertwice-weakness",
      JSON.stringify([{ topic: "Calculus", subtopic: "Differentiation", mistakeCount: 1, lastSeen: 5, trend: "rising" }]),
    );
    store.set(
      "nevertwice-sessions",
      JSON.stringify([{ id: "s", date: 5, questionsAttempted: 1, correct: 0, mistakes: [], durationSeconds: 60 }]),
    );
    store.set(
      "nevertwice-last-detail",
      JSON.stringify([
        { questionId: "q", section: "Mathematics", topic: "Calculus", subtopic: "Differentiation", selected: 0, correctIndex: 1, isCorrect: false },
      ]),
    );
    const snap = exportDossierSnapshot();
    assert.equal(snap.weakness.length, 1);
    assert.equal(snap.sessions.length, 1);
    assert.equal(snap.lastDetail.length, 1);
    const checked = validateDossierImport(JSON.parse(JSON.stringify(snap)));
    if (!checked.ok) assert.fail(`expected valid dossier: ${checked.error}`);
    store.clear();
    importDossierSnapshot(checked.data);
    assert.equal(ExamEngine.getWeaknessNodes().length, 1);
    assert.equal(ExamEngine.getSessions().length, 1);
    assert.equal(ExamEngine.loadLastDetail().length, 1);
  });

  it("rejects garbage with an honest error line", () => {
    const bad = [
      null,
      42,
      "nevertwice",
      [],
      {},
      { weakness: [], sessions: [] },
      { weakness: [], sessions: [], lastDetail: {} },
      { weakness: [{ topic: "T" }], sessions: [], lastDetail: [] },
      {
        weakness: [],
        sessions: [{ id: "s", date: 1, questionsAttempted: 1, correct: 0, mistakes: [{ id: "m" }], durationSeconds: 1 }],
        lastDetail: [],
      },
      { weakness: [], sessions: [], lastDetail: [{ questionId: "q" }] },
    ];
    for (const b of bad) {
      const r = validateDossierImport(b);
      assert.ok(!r.ok, `garbage accepted: ${JSON.stringify(b)}`);
      if (!r.ok) assert.ok(r.error.length > 0, "empty error line");
    }
  });

  it("custody UI is dossier-styled with the honest local-storage line", () => {
    const root = path.resolve(process.cwd());
    const src = fs.readFileSync(path.join(root, "src/components/DossierCustody.tsx"), "utf8");
    assert.ok(src.includes("EXPORT DOSSIER"), "no export button");
    assert.ok(src.includes("IMPORT DOSSIER"), "no import button");
    assert.ok(src.includes("Filed locally in this browser"), "honest line missing");
    assert.ok(src.includes("nevertwice-dossier-"), "filename prefix missing");
    assert.ok(!src.includes("ACTIVE_DRILL_KEY"), "transient drill key must be skipped");
    assert.ok(!src.includes("nevertwice:active-drill"), "transient drill key must be skipped");
    const app = fs.readFileSync(path.join(root, "src/app/app/page.tsx"), "utf8");
    assert.ok(app.includes("DossierCustody"), "/app missing custody section");
  });
});

describe("GAP 2 — all-time exposure + bank coverage", () => {
  it("getQuestionsForSession increments exposure exactly once per dealt id", () => {
    const qs = getQuestionsForSession(20);
    assert.equal(qs.length, 20);
    const map = getExposure();
    assert.equal(Object.keys(map).length, 20);
    for (const q of qs) assert.equal(map[q.id], 1);
  });

  it("buildDrillFallback records once per deal and prefers never-seen bank stems", () => {
    const pools = new Map();
    for (const q of nustSeedQuestions) {
      const k = `${q.topic}::${q.subtopic}`;
      if (!pools.has(k)) pools.set(k, { topic: q.topic, subtopic: q.subtopic, seeds: [] });
      pools.get(k).seeds.push(q);
    }
    const entry = [...pools.values()].find((p) => p.seeds.length >= 3);
    assert.ok(entry, "no subtopic pool with >= 3 seeds");
    const keepUnseen = new Set(entry.seeds.slice(0, 2).map((s) => s.id));
    const heavy = {};
    for (const q of nustSeedQuestions) {
      if (!keepUnseen.has(q.id)) heavy[q.id] = 5;
    }
    store.set(EXPOSURE_KEY, JSON.stringify(heavy));
    const out = withSeededRandom(
      99,
      () => buildDrillFallback([{ topic: entry.topic, subtopic: entry.subtopic, errorType: "concept-gap", count: 2 }]),
    );
    assert.equal(out.length, 2);
    const bankByText = new Map(nustSeedQuestions.map((q) => [norm(q.text), q]));
    const usedIds = new Set();
    for (const q of out) {
      const seed = bankByText.get(norm(q.text));
      assert.ok(seed, `fallback stem not verbatim: ${q.text}`);
      usedIds.add(seed.id);
    }
    assert.deepEqual(usedIds, keepUnseen);
    const after = getExposure();
    for (const q of out) assert.equal(after[q.id], 1);
  });

  it("buildDrillQuestions (fallback path) records exposure once per deal", async () => {
    const targets = [{ topic: "Calculus", subtopic: "Differentiation", errorType: "concept-gap", count: 3 }];
    const out = await buildDrillQuestions(targets);
    assert.equal(out.length, 3);
    const after = getExposure();
    for (const q of out) assert.equal(after[q.id], 1);
  });

  it("coverage counts distinct bank ids with timesSeen > 0", () => {
    const ids = nustSeedQuestions.map((q) => q.id);
    assert.equal(ids.length, 120);
    assert.equal(getCoverageCount(ids), 0);
    recordExposureIds([ids[0], ids[1], ids[1]]);
    assert.equal(getCoverageCount(ids), 2);
    assert.equal(timesSeen(ids[0]), 1);
    assert.equal(timesSeen(ids[1]), 2);
    assert.equal(timesSeen(ids[2]), 0);
  });

  it("coverage meter renders DOSSIER COMPLETENESS n/120 FILED", () => {
    const root = path.resolve(process.cwd());
    const src = fs.readFileSync(path.join(root, "src/components/BankCoverage.tsx"), "utf8");
    assert.ok(src.includes("DOSSIER COMPLETENESS"), "meter headline missing");
    assert.ok(src.includes("getCoverageCount"), "meter math not wired");
    assert.ok(src.includes('role="progressbar"'), "no progressbar semantics");
  });
});

describe("GAP 3 — offline service worker + bank-mode badge", () => {
  const root = path.resolve(process.cwd());
  const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

  it("versioned worker: cache-first shell, network-only /api, navigation fallback", () => {
    const sw = read("public/sw.js");
    assert.ok(sw.includes("nevertwice-v1"), "no versioned cache string");
    assert.ok(sw.includes("/api/"), "api path not handled");
    assert.ok(sw.includes("skipWaiting"), "no skipWaiting");
    assert.ok(sw.includes("clients.claim"), "no clients.claim");
    assert.ok(sw.includes("navigate"), "no navigation fallback");
  });

  it("layout registers once; app + session headers show OFFLINE — BANK MODE", () => {
    const layout = read("src/app/layout.tsx");
    assert.ok(layout.includes("ServiceWorkerRegister"), "SW not registered in layout");
    const badge = read("src/components/OfflineBadge.tsx");
    assert.ok(badge.includes("OFFLINE — BANK MODE"), "badge copy missing");
    assert.ok(badge.includes("online") && badge.includes("offline"), "no online/offline listeners");
    for (const p of ["src/app/app/page.tsx", "src/app/session/page.tsx"]) {
      const src = read(p);
      assert.ok(src.includes("OfflineBadge"), `${p}: no offline badge`);
    }
  });
});

describe("GAP 4 — NET-difficulty calibration", () => {
  it("prompt carries the single-concept ~54s line with every existing line intact", () => {
    const p = buildDrillPrompt([{ topic: "Calculus", subtopic: "Differentiation", errorType: "concept-gap", count: 1 }]);
    assert.ok(p.includes("uniformly across positions"), "existing uniform-distribution line lost");
    assert.ok(
      p.includes("NET-level difficulty: single-concept questions solvable in ~54 seconds; no multi-step monsters, no trick options a real paper would never print."),
      "calibration line missing",
    );
  });
});

describe("FULL MOCK planner — 200Q NET weighting, bank-first fill", () => {
  it("subjects sum to exactly 200 with the 80/60/30/20/10 split", () => {
    assert.deepEqual(
      MOCK_SUBJECTS.map((s) => [s.subject, s.count]),
      [
        ["Mathematics", 80],
        ["Physics", 60],
        ["Chemistry", 30],
        ["English", 20],
        ["Intelligence", 10],
      ],
    );
    assert.equal(MOCK_TOTAL_QUESTIONS, 200);
    assert.equal(
      MOCK_SUBJECTS.reduce((n, s) => n + s.count, 0),
      200,
    );
  });

  it("bank-first fill never exceeds bank per-subject counts; remainder math correct", () => {
    const bankCounts = {};
    for (const q of nustSeedQuestions) bankCounts[q.section] = (bankCounts[q.section] ?? 0) + 1;
    const groqBySubject = {};
    for (const f of planMockFill()) {
      assert.ok(f.bankTake <= (bankCounts[f.subject] ?? 0), `${f.subject}: bankTake exceeds bank`);
      assert.equal(f.bankTake + f.groqNeed, f.need);
      groqBySubject[f.subject] = f.groqNeed;
    }
    assert.deepEqual(groqBySubject, {
      Mathematics: 44,
      Physics: 30,
      Chemistry: 6,
      English: 2,
      Intelligence: 0,
    });
  });

  it("remainder chunks into ≤12-question batches (≈7 batches for 82)", () => {
    const batches = planMockBatches(planMockFill());
    let total = 0;
    for (const b of batches) {
      const n = b.reduce((x, s) => x + s.count, 0);
      assert.ok(n >= 1 && n <= MOCK_BATCH_MAX, `batch size ${n}`);
      total += n;
    }
    assert.equal(total, 82);
    assert.equal(batches.length, 7);
  });
});

describe("FULL MOCK prompt — strict contract without error targeting", () => {
  it("carries the contract + calibration, no drill error-type targeting", () => {
    const p = buildMockPrompt([{ subject: "Mathematics", count: 12 }]);
    assert.ok(p.includes("Write exactly 12 multiple-choice questions"), "count line missing");
    assert.ok(p.includes("Balanced NET paper"), "balanced-paper brief missing");
    assert.ok(p.includes("STRICT OUTPUT CONTRACT"), "contract missing");
    assert.ok(
      p.includes("NET-level difficulty: single-concept questions solvable in ~54 seconds; no multi-step monsters, no trick options a real paper would never print."),
      "calibration missing",
    );
    assert.ok(p.includes("uniformly across positions"), "key-spread line missing");
    for (const w of ["MISREAD", "FORMULA-ERROR", "TIME-PRESSURE", "CONCEPT-GAP", "SILLY-MISTAKE", "errorType"]) {
      assert.ok(!p.includes(w), `drill targeting leaked: ${w}`);
    }
  });

  it("shared validator accepts a valid mock item, rejects bad ones", () => {
    const ok = JSON.stringify([
      { text: "Mock Q?", options: ["A", "B", "C", "D"], correctIndex: 1, explanation: "B is right because the key step applies." },
    ]);
    assert.equal(parseStrictDrillJson(ok).length, 1);
    const noExpl = JSON.stringify([{ text: "Q?", options: ["A", "B", "C", "D"], correctIndex: 0 }]);
    assert.throws(() => parseStrictDrillJson(noExpl), /bad explanation/);
    const dup = JSON.stringify([
      { text: "Q?", options: ["A", "A", "B", "C"], correctIndex: 0, explanation: "A is right." },
    ]);
    assert.throws(() => parseStrictDrillJson(dup), /duplicate options/);
  });
});

describe("FULL MOCK pipeline — bank cycling without Groq", () => {
  it(
    "assembles 200 verbatim questions with the NET split; exposure once per id",
    async () => {
      const paper = await buildMockQuestions();
      assert.equal(paper.length, 200);
      const counts = {};
      for (const q of paper) counts[q.section] = (counts[q.section] ?? 0) + 1;
      assert.deepEqual(counts, {
        Mathematics: 80,
        Physics: 60,
        Chemistry: 30,
        English: 20,
        Intelligence: 10,
      });
      const bankByText = new Map(nustSeedQuestions.map((q) => [norm(q.text), q]));
      for (const q of paper) {
        const seed = bankByText.get(norm(q.text));
        assert.ok(seed, `non-verbatim stem: ${q.text}`);
        assert.equal(q.options[q.correctIndex], seed.options[seed.correctIndex], "key mismatch");
        assert.ok(q.explanation.trim().length > 0, "missing explanation");
      }
      const ids = new Set(paper.map((q) => q.id));
      assert.equal(ids.size, 200, "emitted ids not unique");
      const after = getExposure();
      for (const q of paper) assert.equal(after[q.id], 1);
    },
    { timeout: 30000 },
  );
});

describe("FULL MOCK timer — 180min constant, expiry files time-pressure", () => {
  it("mock clock is 180 minutes", () => {
    assert.equal(MOCK_TOTAL_SECONDS, 180 * 60);
  });

  it("applyMockExpiry files only the unanswered as time-pressure", () => {
    const out = applyMockExpiry([2, null, 0, null], ["misread", null, null, null]);
    assert.deepEqual(out.answers, [2, TIMEOUT_ANSWER, 0, TIMEOUT_ANSWER]);
    assert.deepEqual(out.errorKinds, ["misread", "time-pressure", null, "time-pressure"]);
  });

  it("session page wires ?mode=mock to the global countdown", () => {
    const root = path.resolve(process.cwd());
    const src = fs.readFileSync(path.join(root, "src/app/session/page.tsx"), "utf8");
    assert.ok(src.includes("mode") && src.includes("mock"), "no mock mode detection");
    assert.ok(src.includes("MOCK_TOTAL_SECONDS"), "no 180min clock");
    assert.ok(src.includes("applyMockExpiry"), "expiry fold not wired");
  });

  it("mock route has its own 25/hr bucket and ≤12 validation", () => {
    const root = path.resolve(process.cwd());
    const mock = fs.readFileSync(path.join(root, "src/app/api/generate-mock/route.ts"), "utf8");
    assert.ok(mock.includes("25"), "no 25/hr mock bucket");
    assert.ok(mock.includes("buildMockPrompt"), "prompt not wired");
    assert.ok(mock.includes("parseStrictDrillJson"), "validator not wired");
    assert.ok(!mock.includes("rateBuckets"), "drill bucket touched — must stay separate");
    const drill = fs.readFileSync(path.join(root, "src/app/api/generate-drill/route.ts"), "utf8");
    assert.ok(drill.includes("RATE_LIMIT_MAX = 10"), "drill bucket changed");
  });

  it("mock card is honest — FULL MOCK, never past papers", () => {
    const root = path.resolve(process.cwd());
    const app = fs.readFileSync(path.join(root, "src/app/app/page.tsx"), "utf8");
    assert.ok(app.includes("FULL MOCK"), "no FULL MOCK card");
    assert.ok(
      app.includes("NUST doesn") && app.includes("official past papers"),
      "honest subline missing",
    );
    assert.ok(app.includes("PRINTING YOUR PAPER"), "no printing state");
    assert.ok(!app.includes("PAST PAPERS"), "past-papers label leaked");
  });
});
