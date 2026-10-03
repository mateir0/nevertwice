# SECURITY

Threat model: (1) the Groq API key — a leak burns quota; (2) the Groq quota
itself — both API routes are unauthenticated by design (no login), so rate
limits are the only defense; (3) app integrity — no wrong keys, no broken
sessions, no stale caches.

## Checked — clean, no change needed

- **Secret history.** `git log --all --oneline -- .env` and
  `git log --all --oneline -- .env.local` are empty; `git log -p --all -S
  "GROQ_API_KEY" -- .env` and `-S "gsk_"` across all history return nothing.
  No real key was ever committed. `.gitignore` covers `.env` and
  `.env*.local`. No rotation was required.
- **Key placement.** No `NEXT_PUBLIC_*` secret exists in `src/`. The key
  appears only as `process.env.GROQ_API_KEY` in the two API routes
  (`generate-drill`, `generate-mock`); a test pins exactly that set.
- **Error hygiene.** Neither route logs (`console.*`), returns stack traces,
  or echoes the key — catch blocks return generic codes only
  (`groq-failed`, `rate-limited`, `bad-targets`, `bad-subjects`, `bad-json`,
  `body-too-large`, `mock-quota-spent`). Every 429 carries `Retry-After`.
- **XSS.** No `dangerouslySetInnerHTML`, no `.innerHTML`, no markdown
  renderer anywhere in `src/`. All Groq output, bank text, options, and
  explanations render via React text interpolation (`displayMath(...)`).
  `displayMath` carries a sanitize-first rule for any future HTML rendering.
- **Service worker.** `/api/*` is network-only (stale Groq responses are
  impossible), non-GET requests bypass the worker, cache is versioned
  (`nevertwice-v1`) with old caches deleted on activate, scope is root
  (`/sw.js` registered once from the root layout), and the OFFLINE badge
  re-checks `navigator.onLine` on `online` events so it cannot stick.
- **Dependencies.** `npm audit`: 7 findings (1 moderate, 6 high), all in
  build-time CSS tooling (postcss via next, braces via eslint-config-next).
  Fixes require breaking majors (`next@16`, `eslint-config-next@14`), so
  they are accepted as documented risk: none is reachable from
  unauthenticated HTTP input at runtime. Installed packages match the
  expected set exactly (next, react, react-dom, lucide-react, tailwindcss,
  @tailwindcss/postcss, typescript, eslint, eslint-config-next, playwright,
  @types/*) — no typosquats.

## Fixed in this pass

- **Prompt injection (real gap).** `validTargets` accepted any non-empty
  topic/subtopic, interpolated into the Groq prompt. Now every
  topic/subtopic pair must exist in the NET taxonomy (`nustConfig`);
  anything else 400s before the rate limiter or Groq. Mock subjects were
  already allowlisted; both routes also cap string lengths and reject
  oversized JSON (`body-too-large`, 413; 8KB drill / 4KB mock) before any
  validation work. Verified: all 120 bank questions are taxonomy-clean, so
  legit planner traffic can never 400.
- **Prototype pollution (defense in depth).** `validateDossierImport` now
  rejects any object containing `__proto__`/`constructor`/`prototype` keys
  with the honest one-line reason; import still replaces keys wholesale
  (no recursive merge). Exposure read/write paths skip the same keys.
- **Security headers.** `next.config.ts` sends `X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
  strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`
  on all routes (`/:path*`), verified on page and API responses.

## Best-effort by design (not fixable in code)

- **In-memory rate limiters are per-instance.** On Vercel serverless each
  instance holds its own `Map`, so the drill (10/hr), mock (25/hr), and
  daily mock-cap (3/day) buckets are approximate, not global. This is
  documented in code comments. The hard backstop is Groq's own 429: any
  Groq failure (429 included) falls back to the deterministic seed bank
  (drills) or Retry-After backoff + verbatim bank cycling (mocks), so quota
  can never be forced and the features never break. A global limiter would
  need shared state (e.g. Upstash Redis) — deferred until abuse is observed.

## Adversarial verification (live, local prod build)

- Injection topic (`Ignore all previous instructions…`) → 400, never
  reached Groq. Legit taxonomy pair → 200. Mock `count=999` → 400.
  20KB body → 413.
- Hammer: 15 rapid valid 1-question drills from one IP (1 earlier legit
  request had consumed 1 slot) → 9 passed quota guards, 6 returned 429
  `rate-limited`. Bucket math exact (10 slots, then cut off).
- `__proto__` dossier payloads (top-level, nested, constructor) → clean
  rejection, `Object.prototype` untouched (unit-tested).
- `npm run build` clean, `npm test` green (74/74).

## Owner action required

- **Vercel dashboard:** scope `GROQ_API_KEY` to Production only (not
  Preview). No repo config exists for this (no `vercel.json`/`.vercel`
  directory) — it must be confirmed in the dashboard by the owner.
