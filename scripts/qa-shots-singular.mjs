// QA screenshot: 1-mistake drill reason in singular ("1 concept gap").
// Run:  npx next start -p 3100  (in background)
//       node scripts/qa-shots-singular.mjs
import { chromium } from "playwright";

const BASE = process.env.QA_BASE ?? "http://localhost:3100";
const now = Date.now();

const seed = {
  weakness: [
    { topic: "Algebra", subtopic: "Quadratic Equations", mistakeCount: 1, lastSeen: now, trend: "rising" },
  ],
  sessions: [
    {
      id: "session-one",
      date: now - 1000,
      questionsAttempted: 1,
      correct: 0,
      mistakes: [
        { id: "m1", questionId: "bank-math-algebra-01", topic: "Algebra", subtopic: "Quadratic Equations", errorType: "concept-gap", timestamp: now - 1000, sessionId: "session-one" },
      ],
      durationSeconds: 54,
      attemptedKeys: ["Algebra::Quadratic Equations"],
    },
  ],
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript((data) => {
    localStorage.setItem("nevertwice-weakness", JSON.stringify(data.weakness));
    localStorage.setItem("nevertwice-sessions", JSON.stringify(data.sessions));
  }, seed);

  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.getByLabel("Next drill").screenshot({ path: "qa-app-singular-reason.png" });
  console.log("shot saved: qa-app-singular-reason.png");
} finally {
  await browser.close();
}
