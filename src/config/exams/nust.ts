import type { ExamConfig, Question } from "@/types";
import { shuffleOptions } from "@/engine/question-generator";
import { getExposure, recordExposureIds } from "@/engine/exposure";
import { nustBank } from "./nust-bank";

/**
 * NUST Entry Test (NET) — exam-specific knowledge lives ONLY here.
 * The generic engine in src/engine/ must never import this file.
 */
export const nustConfig: ExamConfig = {
  id: "nust-net",
  name: "NUST Entry Test",
  shortName: "NET",
  totalQuestions: 200,
  totalMinutes: 180,
  secondsPerQuestion: 54,
  negativeMarking: false,
  sections: [
    {
      id: "mathematics",
      name: "Mathematics",
      questionCount: 80,
      topics: [
        { id: "algebra", name: "Algebra", subtopics: ["Quadratic Equations", "Sequences & Series", "Complex Numbers", "Matrices"] },
        { id: "calculus", name: "Calculus", subtopics: ["Limits", "Differentiation", "Integration", "Differential Equations"] },
        { id: "geometry", name: "Analytic Geometry", subtopics: ["Lines & Circles", "Conic Sections", "Vectors"] },
        { id: "trigonometry", name: "Trigonometry", subtopics: ["Identities", "Equations", "Triangle Solutions"] },
        { id: "probability", name: "Probability", subtopics: ["Basic Probability", "Distributions"] },
      ],
    },
    {
      id: "physics",
      name: "Physics",
      questionCount: 60,
      topics: [
        { id: "mechanics", name: "Mechanics", subtopics: ["Kinematics", "Newton Laws", "Work Energy Power", "Rotational Motion", "Gravitation"] },
        { id: "thermo", name: "Thermodynamics", subtopics: ["Laws of Thermodynamics", "Kinetic Theory", "Heat Transfer"] },
        { id: "em", name: "Electromagnetism", subtopics: ["Electrostatics", "Current Electricity", "Magnetism", "AC Circuits"] },
        { id: "optics", name: "Optics", subtopics: ["Ray Optics", "Wave Optics"] },
        { id: "modern", name: "Modern Physics", subtopics: ["Photoelectric Effect", "Atomic Models", "Nuclear Physics"] },
      ],
    },
    {
      id: "chemistry",
      name: "Chemistry",
      questionCount: 30,
      topics: [
        { id: "physical", name: "Physical Chemistry", subtopics: ["Atomic Structure", "Chemical Bonding", "Thermochemistry", "Equilibrium"] },
        { id: "inorganic", name: "Inorganic Chemistry", subtopics: ["Periodic Properties", "p-block", "Coordination Compounds"] },
        { id: "organic", name: "Organic Chemistry", subtopics: ["Hydrocarbons", "Alcohols & Ethers", "Carbonyl Compounds"] },
      ],
    },
    {
      id: "english",
      name: "English",
      questionCount: 20,
      topics: [
        { id: "grammar", name: "Grammar", subtopics: ["Tenses", "Sentence Structure", "Active & Passive"] },
        { id: "vocab", name: "Vocabulary", subtopics: ["Synonyms", "Antonyms", "Idioms"] },
        { id: "comp", name: "Comprehension", subtopics: ["Passage Reading", "Inference"] },
      ],
    },
    {
      id: "intelligence",
      name: "Intelligence",
      questionCount: 10,
      topics: [
        { id: "logical", name: "Logical Reasoning", subtopics: ["Series", "Analogies", "Coding-Decoding"] },
        { id: "nonverbal", name: "Non-Verbal", subtopics: ["Pattern Completion", "Mirror Images"] },
      ],
    },
  ],
};

/**
 * The live seed bank: 120 real NUST-NET-style MCQs (see nust-bank.ts).
 * The old 20-question "Stand-in drill" placeholder set is gone — nothing
 * in the app may depend on placeholder text anymore.
 */
export const nustSeedQuestions: Question[] = nustBank;

// ---------- cross-session freshness ----------

const RECENT_KEY = "nevertwice-recent-qids";
/** Question IDs dealt across the last 3 sessions (3 × 20). Most-recent first. */
const RECENT_CAP = 60;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** IDs dealt recently, most-recent first. Empty outside the browser. */
export function getRecentQuestionIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

/**
 * Record dealt bank IDs as seen. Unknown IDs (e.g. per-drill generated IDs)
 * are ignored so the list only ever tracks real bank questions.
 */
export function recordSeenQuestionIds(ids: string[]): void {
  if (!isBrowser()) return;
  const known = new Set(nustSeedQuestions.map((q) => q.id));
  const fresh = ids.filter((id) => known.has(id));
  if (fresh.length === 0) return;
  try {
    const prev = getRecentQuestionIds().filter((id) => !fresh.includes(id));
    localStorage.setItem(RECENT_KEY, JSON.stringify([...fresh, ...prev].slice(0, RECENT_CAP)));
  } catch {
    // storage full / private mode — ignore (freshness degrades, app works)
  }
}

function shuffled<T>(arr: T[]): T[] {
  const pool = [...arr];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function getQuestionsForSession(count = 20): Question[] {
  const recent = new Set(getRecentQuestionIds());
  const exposure = getExposure();
  // Prefer questions unseen in the last 3 sessions; within that, weight by
  // all-time exposure ascending — never-seen first, then least-seen.
  // Shuffle first so ties within an exposure tier stay random (stable sort).
  const pool = shuffled(nustSeedQuestions.filter((q) => !recent.has(q.id))).sort(
    (a, b) => (exposure[a.id] ?? 0) - (exposure[b.id] ?? 0),
  );
  let selected = pool.slice(0, Math.min(count, pool.length));

  if (selected.length < count) {
    // Bank can't fill 20 fresh (only possible if the bank shrinks below
    // RECENT_CAP + count): top up from least-recently-seen first.
    const recentList = getRecentQuestionIds();
    const picked = new Set(selected.map((q) => q.id));
    const byId = new Map(nustSeedQuestions.map((q) => [q.id, q]));
    for (let i = recentList.length - 1; i >= 0 && selected.length < count; i--) {
      const q = byId.get(recentList[i]);
      if (q && !picked.has(q.id)) {
        selected.push(q);
        picked.add(q.id);
      }
    }
    // Absolute last resort (bank smaller than count): cycle the bank.
    for (let i = 0; i < nustSeedQuestions.length && selected.length < count; i++) {
      const q = nustSeedQuestions[i];
      if (!picked.has(q.id)) {
        selected.push(q);
        picked.add(q.id);
      }
    }
  }

  recordSeenQuestionIds(selected.map((q) => q.id));
  // All-time exposure: exactly one increment per deal. The session page
  // deals once per mount (deal-once ref), so StrictMode cannot double-fire.
  recordExposureIds(selected.map((q) => q.id));
  // Every assembled question gets a fresh unbiased option shuffle so
  // correctIndex is remapped and the A/B/C/D position is not biased by
  // the seed data (which is almost all index 0).
  return selected.map(shuffleOptions);
}

export function getAllTopics(): { topic: string; subtopic: string; section: string }[] {
  const out: { topic: string; subtopic: string; section: string }[] = [];
  nustConfig.sections.forEach((section) => {
    section.topics.forEach((topic) => {
      topic.subtopics.forEach((subtopic) => {
        out.push({ topic: topic.name, subtopic, section: section.name });
      });
    });
  });
  return out;
}
