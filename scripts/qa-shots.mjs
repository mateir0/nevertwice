// QA screenshots for the follow-up pass. Seeds localStorage with realistic
// weakness data, then captures landing (/), /app, /results.
// Run:  npx next start -p 3100  (in background)
//       node scripts/qa-shots.mjs
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://localhost:3100";
const DAY = 86400000;
const now = Date.now();

const weakness = [
  { topic: "Algebra", subtopic: "Quadratic Equations", mistakeCount: 3, lastSeen: now, trend: "rising" },
  { topic: "Physical Chemistry", subtopic: "Atomic Structure", mistakeCount: 2, lastSeen: now - DAY, trend: "rising" },
  { topic: "Non-Verbal", subtopic: "Pattern Completion", mistakeCount: 1, lastSeen: now - 2 * DAY, trend: "falling" },
];

const sessions = [
  {
    id: "session-new",
    date: now - 1000,
    questionsAttempted: 3,
    correct: 1,
    mistakes: [
      { id: "m1", questionId: "bank-math-algebra-01", topic: "Algebra", subtopic: "Quadratic Equations", errorType: "misread", timestamp: now - 1000, sessionId: "session-new" },
      { id: "m2", questionId: "bank-int-nonverbal-01", topic: "Non-Verbal", subtopic: "Pattern Completion", errorType: "silly-mistake", timestamp: now - 2000, sessionId: "session-new" },
    ],
    durationSeconds: 120,
    attemptedKeys: ["Algebra::Quadratic Equations", "Non-Verbal::Pattern Completion"],
  },
  {
    id: "session-old",
    date: now - DAY,
    questionsAttempted: 2,
    correct: 1,
    mistakes: [
      { id: "m0", questionId: "bank-chem-physical-01", topic: "Physical Chemistry", subtopic: "Atomic Structure", errorType: "concept-gap", timestamp: now - DAY, sessionId: "session-old" },
    ],
    durationSeconds: 90,
    attemptedKeys: ["Physical Chemistry::Atomic Structure"],
  },
];

const seed = { weakness, sessions };

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript((data) => {
    localStorage.setItem("nevertwice-weakness", JSON.stringify(data.weakness));
    localStorage.setItem("nevertwice-sessions", JSON.stringify(data.sessions));
  }, seed);

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.locator("#board").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "qa-landing-board.png" });

  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500); // allow async drill generation (Groq or fallback)
  await page.screenshot({ path: "qa-app.png", fullPage: true });

  await page.goto(`${BASE}/results`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "qa-results.png", fullPage: true });

  console.log("shots saved: qa-landing-board.png qa-app.png qa-results.png");
} finally {
  await browser.close();
}
