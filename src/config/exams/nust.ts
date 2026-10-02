import type { ExamConfig, Question } from "@/types";
import { shuffleOptions } from "@/engine/question-generator";

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

type Seed = [section: string, topic: string, subtopic: string, stem: string, options: [string, string, string, string], correct: number];

const SEEDS: Seed[] = [
  ["Mathematics", "Algebra", "Quadratic Equations", "Practice drill: if x^2 - 5x + 6 = 0, the roots are?", ["x = 2, 3", "x = 1, 6", "x = -2, -3", "x = 0, 5"], 0],
  ["Mathematics", "Algebra", "Sequences & Series", "Practice drill: the 5th term of 2, 6, 18, ... is?", ["54", "162", "486", "108"], 1],
  ["Mathematics", "Calculus", "Differentiation", "Practice drill: d/dx (x^3) equals?", ["3x^2", "x^2", "3x", "x^3 / 3"], 0],
  ["Mathematics", "Calculus", "Integration", "Practice drill: integral of 2x dx equals?", ["x^2 + C", "2 + C", "x + C", "2x^2 + C"], 0],
  ["Mathematics", "Trigonometry", "Identities", "Practice drill: sin^2(x) + cos^2(x) equals?", ["1", "0", "2", "tan(x)"], 0],
  ["Physics", "Mechanics", "Kinematics", "Practice drill: a body at rest accelerates at 2 m/s^2 for 3 s. Final velocity?", ["6 m/s", "3 m/s", "9 m/s", "12 m/s"], 0],
  ["Physics", "Mechanics", "Newton Laws", "Practice drill: a 2 kg mass under 10 N net force accelerates at?", ["5 m/s^2", "20 m/s^2", "2 m/s^2", "0.2 m/s^2"], 0],
  ["Physics", "Mechanics", "Work Energy Power", "Practice drill: 100 J of work in 20 s is what power?", ["5 W", "2000 W", "120 W", "80 W"], 0],
  ["Physics", "Electromagnetism", "Electrostatics", "Practice drill: like charges do what?", ["Repel", "Attract", "Cancel", "Nothing"], 0],
  ["Physics", "Electromagnetism", "Current Electricity", "Practice drill: V = 12 V, R = 4 ohm. Current?", ["3 A", "48 A", "8 A", "16 A"], 0],
  ["Chemistry", "Physical Chemistry", "Atomic Structure", "Practice drill: electrons were discovered via?", ["Cathode rays", "Alpha scattering", "Photoelectric effect", "X-ray diffraction"], 0],
  ["Chemistry", "Physical Chemistry", "Chemical Bonding", "Practice drill: NaCl is held by which bond?", ["Ionic", "Covalent", "Metallic", "Hydrogen"], 0],
  ["Chemistry", "Organic Chemistry", "Hydrocarbons", "Practice drill: methane has which geometry?", ["Tetrahedral", "Linear", "Planar", "Pyramidal"], 0],
  ["Chemistry", "Inorganic Chemistry", "Periodic Properties", "Practice drill: most electronegative element?", ["Fluorine", "Oxygen", "Chlorine", "Sodium"], 0],
  ["English", "Grammar", "Tenses", "Practice drill: choose the correct sentence.", ["She goes to school daily.", "She go to school daily.", "She going to school daily.", "She gone to school daily."], 0],
  ["English", "Vocabulary", "Synonyms", "Practice drill: pick the synonym of RAPID.", ["Fast", "Slow", "Quiet", "Heavy"], 0],
  ["English", "Comprehension", "Inference", "Practice drill: 'He arrived drenched.' What can be inferred?", ["It was raining.", "He was swimming.", "He spilled water.", "He was crying."], 0],
  ["Intelligence", "Logical Reasoning", "Series", "Practice drill: next in 3, 6, 12, 24, ...?", ["48", "36", "30", "42"], 0],
  ["Intelligence", "Logical Reasoning", "Analogies", "Practice drill: Book is to Reading as Pen is to?", ["Writing", "Drawing only", "Eating", "Sleeping"], 0],
  ["Intelligence", "Non-Verbal", "Pattern Completion", "Practice drill: a square rotated 90 degrees still looks like?", ["A square", "A triangle", "A circle", "A line"], 0],
];

export const nustSeedQuestions: Question[] = SEEDS.map((s, i) => ({
  id: `nust-seed-${i + 1}`,
  section: s[0],
  topic: s[1],
  subtopic: s[2],
  text: `Stand-in drill Q${i + 1} — ${s[3]}`,
  options: [s[4][0], s[4][1], s[4][2], s[4][3]],
  correctIndex: s[5],
  isPlaceholder: true,
}));

export function getQuestionsForSession(count = 20): Question[] {
  const pool = [...nustSeedQuestions];
  // Fisher-Yates shuffle the bank, then take the first n. Never pick
  // with replacement — if the bank holds fewer than n, take all shuffled,
  // never duplicate.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const selected = pool.slice(0, Math.min(count, pool.length));
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
