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
  parseStrictDrillJson,
  shuffleOptions,
} from "../src/engine/question-generator.ts";
import { planDrill, planToGenTargets } from "../src/engine/drill-planner.ts";
import {
  ExamEngine,
  TIMEOUT_ANSWER,
  mistakesFromAnswers,
  nodeKey,
} from "../src/engine/exam-engine.ts";
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
