// Structural test: the 120-question NUST-NET bank.
// Exercises the REAL sources (nust-bank.ts + nust.ts taxonomy).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nustBank } from "../src/config/exams/nust-bank.ts";
import { nustConfig } from "../src/config/exams/nust.ts";

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

function expectedSubtopics() {
  const out = new Map();
  for (const sec of nustConfig.sections) {
    for (const t of sec.topics) {
      for (const st of t.subtopics) {
        out.set(`${sec.name}::${t.name}::${st}`, 0);
      }
    }
  }
  return out;
}

// Four forced singletons: Physics owns 17 subtopics, and universal >= 2
// coverage would need 34 slots against the fixed budget of 30.
const SINGLETON_EXCEPTIONS = new Set([
  "Physics::Thermodynamics::Kinetic Theory",
  "Physics::Thermodynamics::Heat Transfer",
  "Physics::Modern Physics::Atomic Models",
  "Physics::Modern Physics::Nuclear Physics",
]);

describe("nust bank — structure", () => {
  it("holds exactly 120 questions", () => {
    assert.equal(nustBank.length, 120);
  });

  it("matches the fixed section budgets 36/30/24/18/12", () => {
    const counts = {};
    for (const q of nustBank) counts[q.section] = (counts[q.section] ?? 0) + 1;
    assert.deepEqual(counts, {
      Mathematics: 36,
      Physics: 30,
      Chemistry: 24,
      English: 18,
      Intelligence: 12,
    });
  });

  it("every question has 4 non-empty string options and a valid key", () => {
    for (const q of nustBank) {
      assert.ok(Array.isArray(q.options) && q.options.length === 4, `${q.id}: options`);
      for (const o of q.options) assert.ok(typeof o === "string" && o.trim().length > 0, `${q.id}: option string`);
      assert.ok(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3, `${q.id}: correctIndex`);
      assert.ok(typeof q.text === "string" && q.text.trim().length > 0, `${q.id}: text`);
      assert.equal(q.isPlaceholder, false, `${q.id}: isPlaceholder`);
    }
  });

  it("has unique IDs and no duplicate stems", () => {
    const ids = new Set(nustBank.map((q) => q.id));
    assert.equal(ids.size, 120);
    const stems = new Set();
    for (const q of nustBank) {
      const k = norm(q.text);
      assert.ok(!stems.has(k), `duplicate stem: ${q.text}`);
      stems.add(k);
    }
  });

  it("has no duplicate options within any question", () => {
    for (const q of nustBank) {
      const set = new Set(q.options.map(norm));
      assert.equal(set.size, 4, `${q.id}: duplicate options`);
    }
  });

  it("has no placeholder prefixes and no caret notation", () => {
    for (const q of nustBank) {
      const low = q.text.toLowerCase();
      assert.ok(!low.startsWith("drill") && !low.startsWith("practice") && !low.startsWith("stand-in"), `${q.id}: prefix`);
      assert.ok(!q.text.includes("^"), `${q.id}: caret in stem`);
      for (const o of q.options) assert.ok(!o.includes("^"), `${q.id}: caret in option`);
    }
  });

  it("covers every taxonomy subtopic (>=2 except 4 forced physics singletons)", () => {
    const counts = expectedSubtopics();
    for (const q of nustBank) {
      const key = `${q.section}::${q.topic}::${q.subtopic}`;
      assert.ok(counts.has(key), `${q.id}: outside taxonomy (${key})`);
      counts.set(key, counts.get(key) + 1);
    }
    for (const [key, n] of counts) {
      if (SINGLETON_EXCEPTIONS.has(key)) {
        assert.ok(n >= 1, `${key}: uncovered singleton`);
      } else {
        assert.ok(n >= 2, `${key}: only ${n} question(s)`);
      }
    }
  });
});
