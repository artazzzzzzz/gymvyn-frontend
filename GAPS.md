# Gymvyn — Gaps & Weaknesses Audit

Honest audit of `gymvyn-frontend` + `gymvyn-backend`, most severe first. Each item:
**what**, **where**, **why it matters**, **suggested fix** (scoped for a single task).

Line numbers are from the state explored on 2026-07-07 and may drift — grep to confirm.

---

## CRITICAL

### 1. ~~Unauthenticated account takeover via password reset~~ — FIXED 2026-07-08
- **What it was:** `POST /api/users/:userId/change-password` took a `userId` from the URL and
  a `new_password` from the body, then called `supabase.auth.admin.updateUserById(userId, …)`
  with the **service-role admin API**, with **no authentication and no ownership check**.
  Anyone who knew (or guessed/enumerated) a user UUID could set that user's password and take
  over the account.
- **Status:** Fixed in `gymvyn-backend` commits `6b262338` (ownership check) and `10afc9ec`
  (`auth` + `authLimiter` middleware added), both 2026-07-08 — one day before this audit's
  stated exploration date, so the audit simply predated the fix. Confirmed still in place as
  of 2026-07-10 at `server.js:5091`: the route now runs `authLimiter, auth` and returns
  `403 Forbidden` unless `req.user.id === userId`.
- **Why it mattered:** Full account compromise for any user, including gym owners, with a
  single unauthenticated request.
- **No further action needed on this item.** Kept here (struck through) as a record rather
  than deleted, since item 2 below documents the same class of bug still open elsewhere.

### 2. Broad IDOR / broken authorization across the legacy monolith
- **What:** 92 of 93 inline route handlers in `server.js` do not use the `auth` middleware.
  They accept `userId` / `gymId` / `memberId` / `paymentId` directly from the URL or body
  and execute against Postgres using the **service-role key**, which **bypasses Row-Level
  Security**. Examples: `GET /api/users/:userId` (returns PII: phone, weight, height,
  injuries), `PATCH /api/users/:userId` (edit profile), `GET /api/gym-members?gymId=`,
  `GET /api/gym-payments/:gymId`, `POST /api/checkin`, all the food-log and workout routes.
- **Where:** `gymvyn-backend/server.js` — see `GET /api/users/:userId` (4884),
  `PATCH /api/users/:userId` (4902), `GET /api/gym-members` (1425),
  `GET /api/gym-payments/:gymId` (2236), etc. Quantify with:
  `grep -cE "app\.(get|post|put|patch|delete)\('/" server.js` (93) vs
  `grep -cE ", auth," server.js` (1).
- **Why it matters:** Any unauthenticated caller can read and modify essentially any user's
  or gym's data by iterating UUIDs. Since RLS is off (service key), there is no second line
  of defense.
- **Fix (do it incrementally, one route group per task):** For each inline route, add the
  `auth` middleware and an ownership/role check (`req.user.id === userId`, or verify the
  caller owns/staffs the `gymId`). The migration is already underway for trainer routes
  (commit `b94591e`); continue it. Longer term, move these handlers into modular route files
  under `routes/` where `auth` is the default.

---

## HIGH

### 3. CORS is wide open
- **What:** `app.use(cors())` with no options reflects **any** origin and allows
  credentials-style cross-site calls. The `allowedOrigins` allow-list defined just above is
  never passed to `cors()` — it's dead code.
- **Where:** `gymvyn-backend/server.js:18` (list) and `:25` (`app.use(cors())`).
- **Why it matters:** Combined with the unauthenticated routes above, any website can script
  requests against the API from a victim's browser. Even after auth is fixed, an open CORS
  policy widens CSRF/abuse surface.
- **Fix:** `app.use(cors({ origin: allowedOrigins, credentials: true }))` and add the
  production frontend origin to the list.

### 4. Divergent auth middleware implementations invite mistakes
- **What:** There are three separate JWT-verification implementations that set **different
  request properties**: `middleware/auth.js` sets `req.user`; the inline `auth` in
  `src/routes/ai.js` sets `req.userId`; `routes/staffRoutes.js` defines its own
  `authenticateToken` + `requireGymOwner` + `requireStaffRole`. A handler copied from one
  context to another will read the wrong property (`req.user.id` vs `req.userId`) and either
  crash or silently mis-authorize.
- **Where:** `gymvyn-backend/middleware/auth.js`, `src/routes/ai.js` (~line 14),
  `routes/staffRoutes.js` (~lines 24–70).
- **Why it matters:** Auth is the security boundary; three near-duplicates make it easy to
  ship a route that looks authenticated but isn't, or that reads an undefined user id.
- **Fix:** Consolidate to one middleware module that exports `auth`, `requireGymOwner`,
  `requireStaffRole`, all setting `req.user` (and a convenience `req.userId`). Replace the
  inline copies with imports. Do this as one focused refactor with a grep of every route.

### 5. Frontend `.env` is committed to git
- **What:** `.gitignore` lists `.env*`, but `git ls-files` shows `gymvyn-frontend/.env` is
  **tracked** (added before the ignore rule). It contains `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.
- **Where:** `gymvyn-frontend/.env` (tracked); also `.env.development.local` referencing a
  `VERCEL_OIDC_TOKEN`.
- **Why it matters:** The Supabase **anon** key is public-by-design (low direct risk), but
  committing env files is bad hygiene and risks a future secret (or the `VERCEL_OIDC_TOKEN`)
  being committed the same way. The backend `.env` (which holds the **service key** and AI
  API keys) is correctly untracked — keep it that way.
- **Fix:** `git rm --cached .env .env.development.local`, confirm they're ignored, and rotate
  anything sensitive that was exposed. Verify no secret-bearing env file is tracked in either repo.

---

## MEDIUM

### 6. Two active trainer route files (duplication / confusion)
- **What:** `./trainerRoutes.js` (root, mounted via `require('./trainerRoutes')(app, supabase)`
  at `server.js:4778`) and `routes/trainerRoutes.js` (mounted at `/api/trainer`,
  `server.js:5053`) are both live. Trainer behavior is split across two files with different
  mounting styles.
- **Where:** `gymvyn-backend/trainerRoutes.js` (root, ~30KB) and `routes/trainerRoutes.js`.
- **Why it matters:** A change to "the trainer routes" can miss half the endpoints; the two
  files may disagree on auth posture.
- **Fix:** Audit both, migrate any still-used endpoints from the root file into
  `routes/trainerRoutes.js`, then delete the root file and its `require(...)(app, supabase)`
  mount. Verify no frontend caller depends on a path only the old file served.

### 7. RLS is effectively absent as a safety net
- **What:** Only the chat tables (`conversations`, `messages`) have RLS policies, and even
  those are explicitly documented as defense-in-depth because all access goes through the
  service-role backend. Every other table relies entirely on application-code checks that
  (per items 1–2) are frequently missing.
- **Where:** `gymvyn-backend/migrations/chat_rls_policies.sql` is the only RLS migration;
  no `CREATE POLICY` / `ENABLE ROW LEVEL SECURITY` for members, payments, users, workouts, etc.
- **Why it matters:** With the service key bypassing RLS and app-code checks incomplete,
  there is no backstop. Enabling RLS wouldn't help service-key queries, but it *would* protect
  any direct-from-frontend Supabase read and force a deliberate security posture.
- **Fix:** Enable RLS on the sensitive tables and add participant/owner policies (model them
  on `chat_rls_policies.sql`) so that direct anon/authenticated access is locked down even if
  a query ever runs outside the backend. Treat this as defense-in-depth, not a replacement
  for fixing items 1–2.

### 8. No backend automated tests
- **What:** `npm test` in the backend is `echo "Error: no test specified" && exit 1`. The
  `scripts/` dir has ad-hoc manual test scripts (`test-api-sweep.js`) and result markdown,
  but nothing runs in CI. The critical auth/ownership logic is completely untested.
- **Where:** `gymvyn-backend/package.json` (`scripts.test`), `gymvyn-backend/scripts/`.
- **Why it matters:** The most security-critical code (auth boundaries, payments, XP) has no
  regression protection; the IDOR remediation could silently regress.
- **Fix:** Add a lightweight test runner (e.g. `node --test` or Jest + supertest) and start
  with auth tests: assert that each protected route returns 401 without a token and 403 for a
  non-owner. This directly guards items 1–2.

### 9. Frontend E2E tests need a full running, seeded stack
- **What:** The Playwright suite (`tests/*.spec.js`: `owner`, `trainer`, `rookie`, `solo`,
  `member-l12`, `cross-role`, `smoke`, plus dark-mode visual/runtime) is real and role-based,
  but requires the dev server on `:5174`, a live backend, and a seeded "test ecosystem"
  (`scripts/seed-test-ecosystem.js`, credentials in gitignored markdown). It's not runnable
  from a clean checkout and not wired to CI.
- **Where:** `gymvyn-frontend/tests/`, `gymvyn-frontend/playwright.config.js`,
  `gymvyn-backend/scripts/seed-test-ecosystem.js`.
- **Why it matters:** Tests that can't run on demand rot; visual snapshots drift.
- **Fix:** Document the exact bring-up (seed → backend → `PORT=5174 npm run dev` → `playwright
  test`) in CLAUDE.md (done) and, as a follow-up, add a `docker-compose`/script that stands up
  the seeded stack so the suite is one command.

### 10. `apiFetch` discards server error detail
- **What:** `apiFetch` throws `new Error(\`API error ${res.status}\`)`, dropping the JSON
  `message`/`error` the backend returns. The other helpers (`dietRequest`, `xpFetch`, raw
  `fetch` ones) do surface `data.message`. So error UX depends on which helper a feature happens
  to use.
- **Where:** `gymvyn-frontend/src/utils/api.js:25`.
- **Why it matters:** Users/devs see "API error 400" instead of the real reason; inconsistent
  across the app.
- **Fix:** Make `apiFetch` parse the JSON body and throw `data.error || data.message || \`API
  error ${res.status}\``, matching the other helpers.

---

## LOW

### 11. Debug/preview leftovers shipped
- **What:** A top-level middleware logs `>>> HTTP: <method> <url>` for **every** request
  ("remove once 500 is diagnosed"); `App.jsx` exposes `/preview-exercise` ("DEV PREVIEW —
  remove before shipping"); numerous `console.log`/`console.error` remain.
- **Where:** `gymvyn-backend/server.js:28`; `gymvyn-frontend/src/App.jsx:101`.
- **Why it matters:** Log noise/cost in production; a preview route reachable unauthenticated.
- **Fix:** Remove the request-logging middleware (or gate behind `NODE_ENV !== 'production'`),
  delete the `/preview-exercise` route.

### 12. `ML_INTERNAL_KEY` defaults to a placeholder
- **What:** `ml_client.js` defaults `ML_INTERNAL_KEY` to `'change-me-to-random-string'` if the
  env var is unset. If the ML service uses the same default, the shared secret is public.
- **Where:** `gymvyn-backend/ml_client.js:2`.
- **Why it matters:** Anyone who reaches the ML service could trigger training/scoring with the
  known default key.
- **Fix:** Fail fast (`throw`) if `ML_INTERNAL_KEY` is unset in production instead of defaulting.

### 13. `axios` dependency largely unused
- **What:** `axios` is a frontend dependency but nearly all HTTP goes through `fetch` in
  `api.js`.
- **Where:** `gymvyn-frontend/package.json`.
- **Why it matters:** Dead-ish dependency; pick one HTTP client.
- **Fix:** Grep for `axios` usage; if none/negligible, remove it (or standardize on it).

### 14. Backend has no global input validation or rate limiting
- **What:** Only the AI routes have `aiRateLimit`; there's no global rate limiter and no schema
  validation layer. Numeric/enum body fields (amounts, fees, quantities) are trusted as sent.
- **Where:** backend-wide; e.g. payment/member creation routes in `server.js`.
- **Why it matters:** Brute-force (see item 1), abuse, and bad-data ingestion are unmitigated.
- **Fix:** Add `express-rate-limit` globally (tighter on auth-sensitive routes) and validate
  bodies with a small schema lib (zod/joi) on the money/quantity routes first.

---

## Half-finished work / migrations in flight

- **FitForge → Gymvyn rename** — incomplete across both repos (localStorage `ff_`→`gv_`
  migration in `useAuth.jsx`, `FRONTEND_URL` default `fitforge-frontend.vercel.app`, Cloudinary
  folder `fitforge/progress`, ML service self-name). Finish or explicitly freeze the rename.
- **IDOR remediation** — started (trainer routes hardened in `b94591e`); the inline monolith
  routes are still open (items 1–2).
- **`trainer_gym_join_requests` flow** — recent migration + routes for trainers requesting to
  join a gym by code (bidirectional to the existing owner-invites-trainer flow); verify both
  directions are wired end-to-end in the frontend.
- **Dark-mode audits** — `DARK_MODE_AUDIT.md`, `DARK_MODE_UNRESOLVED.md`,
  `DARK_MODE_VISUAL_ISSUES.md`, `ICON_*` in the frontend root document known-but-unresolved
  visual issues. Treat as a backlog, not settled state.
