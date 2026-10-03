// Quota-cap verification: with MOCK_DAILY_MOCK_CAP temporarily 0 (allows
// exactly 1 batch, 2nd hits the cap), the 2nd POST must be 429
// {error:"mock-quota-spent"} with a Retry-After header — the body the
// client maps to DAILY PRINT QUOTA SPENT — DRILLS UNAFFECTED. BACK TOMORROW.
// Usage: node --import=./tests/register.mjs scripts/verify-mock-quota.mts
const BASE = process.env.MOCK_VERIFY_BASE ?? "http://localhost:3100";

const batch = [{ subject: "Mathematics", count: 12 }];
let passedQuotaGuards = false;
for (let i = 1; i <= 4; i++) {
  const res = await fetch(`${BASE}/api/generate-mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subjects: batch }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(
    `req ${i}: http ${res.status} error=${body.error ?? "-"} retry-after=${res.headers.get("retry-after") ?? "-"}`,
  );
  if (res.status === 429 && body.error === "mock-quota-spent") {
    if (!passedQuotaGuards) {
      console.log("FAIL: quota spent on the very first request");
      process.exit(1);
    }
    console.log("VERIFY-MOCK-QUOTA PASS");
    process.exit(0);
  }
  // Any non-quota answer (200 items, or a Groq-side 429/502) proves the
  // request sailed through the quota guards to the Groq stage.
  if (res.status !== 429 || body.error !== "mock-quota-spent") passedQuotaGuards = true;
}
console.log("FAIL: quota-spent 429 never surfaced");
process.exit(1);
