# Gymvyn — Gaps & Weaknesses Audit

Honest audit across `gymvyn-frontend`, `gymvyn-backend`, `gymvyn-admin`, and
`gymvyn-plans`, most severe first. Each item: **what**, **where**, **why it matters**,
**suggested fix** (scoped for a single task).

Re-audited **2026-07-22**; items fixed same day are listed under "Previously flagged,
now resolved" at the bottom — check there before acting on any older note. Line numbers
drift; grep to confirm.

---

## HIGH

### 1. Plans marketplace has no payment verification (delivery is manual-admin-only) — NEEDS RE-AUDIT, do not fix from this write-up alone
- **What (as of the 2026-07-22 audit):** With `PLANS_PAYMENTS_ENABLED=true`,
  `POST /api/plans/purchases` created a Razorpay order and returned it to the browser,
  but there was **no Razorpay webhook / no `razorpay.utils.validateWebhookSignature`**
  anywhere — a purchase only became `delivered` via a human hitting
  `POST /api/plans/admin/purchases/:id/approve`.
- **Status:** The marketplace model has since changed substantially (per the repo owner,
  2026-07-23) — this description may no longer match the current implementation.
  **Do not implement the "add a webhook" fix below without first re-reading
  `gymvyn-backend/routes/plansRoutes.js`, `gymvyn-plans/`, and any new purchase/delivery
  flow in full.** Treat everything below as historical context, not a current-state claim.
- **Where (as of 2026-07-22):** `gymvyn-backend/routes/plansRoutes.js`
  (`createRazorpayOrder`, `deliverPurchase`, `/admin/purchases/:id/approve`);
  `gymvyn-plans/README.md`.
- **Why it mattered:** Payment/delivery integrity rested on a manual step and the honesty
  of whoever approved. Explicitly staged, half-finished flow.
- **Old suggested fix (verify still applicable before using):** Add an authenticated
  `POST /api/plans/webhook/razorpay` route that verifies the `X-Razorpay-Signature` HMAC
  against `RAZORPAY_WEBHOOK_SECRET`, maps the order back to a purchase, and calls
  `deliverPurchase()` on `payment.captured`.

---

## MEDIUM

### 2. Test coverage is real but uneven; critical stacks still need a seeded bring-up — PARTIALLY FIXED 2026-07-23
- **What:** Backend and frontend now have `node --test` suites and the ML service has
  `pytest`, which is a big improvement. `gymvyn-plans` has only a build + rendered-HTML
  smoke test, and the Playwright E2E suite still needs a live backend + seeded "test
  ecosystem" (`seed-test-ecosystem.js`) and isn't wired to CI.
- **Fixed:** Added `tests/adminRoutesAuth.test.js` (401/403 coverage for every
  `/api/admin/*` route, following `auth.test.js`'s spawn-a-server convention) and
  `tests/userDeletionCascade.test.js` (unit-tests `deleteUserCascade` directly — creates
  and destroys its own disposable Supabase Auth account rather than touching the shared
  seeded fixtures, since the cascade is destructive). Both wired into `npm test`
  (192/193 passing including pre-existing tests, 1 pre-existing skip). **Deliberately
  skipped:** the Plans admin/purchase-routes 403 test and `deliverPurchase` idempotency
  test called for below — the marketplace model was reworked after this list was written
  (see item 1) and shouldn't be tested against a stale understanding of its routes.
  Separately, **`gymvyn-admin` now has a test suite** (it had none before, no runner even
  installed): added `vitest` + `@testing-library/react` + `jsdom` (the natural fit for a
  Vite/React app — `node --test` can't evaluate `import.meta.env`, which
  `src/lib/supabase.js` reads at module load), `vitest.config.js`, and
  `src/test/setup.js` (jest-dom matchers). Wrote `src/lib/adminApi.test.js` (7 tests:
  `authedFetch` rejects with a 401 before ever hitting the network when there's no
  Supabase session, attaches the session token as `Authorization: Bearer`, surfaces the
  backend's `error`/status on a non-ok response, falls back to a generic message when the
  body has none, and `fetchUsers`/`updateUserRole`/`deleteUser` build the right
  URL/method/body) and `src/components/ProtectedRoute.test.jsx` (3 tests covering the
  actual admin security gate: no session → redirect to `/login` without ever calling
  `fetchWhoami`; valid session + `fetchWhoami` resolves → renders the protected route;
  valid session + `fetchWhoami` rejects (not on the `ADMIN_EMAILS` allowlist) → redirect).
  `npm test` now runs `vitest run` (11/11 passing); `npm run lint` and `npm run build`
  stayed clean. `plansAdminApi.js`/`PlansPurchases.jsx` were left untested (marketplace).
  A follow-up pass (2026-07-24) added the HTTP-level Plans admin coverage that was
  previously skipped: `tests/plansAdminAuth.test.js` (401/403 for
  `GET /admin/purchases`, `POST /admin/purchases/:id/approve`, and the two newly-wired
  `POST /admin/listings/:id/suspend|remove` routes — see the "resolved" entry below for
  the suspend/remove fix itself), mirroring `adminRoutesAuth.test.js`'s exact
  spawn-a-server/seeded-fixture convention and, like that file, deliberately omitting the
  "successful Plans admin caller" case (no disposable `PLANS_ADMIN_EMAILS` account
  exists). Also wired the previously-orphaned `tests/plansRoutes.test.js` (pure-function
  unit tests — slug/price/currency validation, Razorpay helper shape) into `npm test`,
  which had never actually run it. `npm test` is now 209/210 (1 pre-existing skip).
  **Deliberately still not covered:** `deliverPurchase`'s idempotency and the full
  payment-approval flow — that needs either a disposable Plans-admin account or the
  Docker-based `test:plans-local-e2e` harness, neither of which this pass added.
- **Fixed (2026-07-24): a one-command seeded stack for Playwright.** Added
  `gymvyn-frontend/scripts/run-e2e.cjs` (`npm run test:e2e`): checks whether the backend
  (`:3000`) and frontend (`:5174`) are already running and reuses them if so; otherwise
  starts the backend, runs `node scripts/seed-test-ecosystem.js` against it, starts the
  frontend on the port Playwright's `global-setup.js` expects, waits for both health
  checks, then runs `npx playwright test` (passing through any CLI args, e.g.
  `npm run test:e2e -- --list`). Only kills the processes it started itself in a
  `finally` block, so it's safe to run against an already-running dev session too.
  Running the bring-up live surfaced a real, separate bug: `seed-test-ecosystem.js`'s
  chat-fixture step (`FATAL: conversations: Could not find the 'client_id' column`)
  was broken — `conversations` was generalized from a trainer/client-only shape to a
  canonical two-participant model (`participant_1_id`/`participant_2_id`, ordered via
  `canonicalPair()`) for the friends/chat rework, but this seed script was never updated
  and still wrote the old `trainer_id`/`client_id` columns, so it hard-failed at step
  9/10 every time and the seeded stack silently never had chat fixtures. **Fixed**:
  rewired the conversation/message seeding block to call the same `SECURITY DEFINER`
  RPCs the app itself uses (`chat_get_or_create_conversation`,
  `chat_send_message` — `migrations/chat_security_phase1_additive.sql`) instead of
  hand-writing participant columns, and to use `canonicalPair()` from
  `src/utils/canMessage.js` for the existence check so `--verify-only` stays read-only.
  Verified live: a full seed run now completes all 10/10 steps, `--verify-only` and a
  second full run are both idempotent (no errors, no duplicate rows), and
  `npm run test:e2e -- --list` runs the full chain end-to-end — backend health check,
  seeding, frontend health check, and Playwright's real login-based `global-setup.js`
  all succeed, listing all 119 tests across the 9 spec files.
- **Still open:** the skipped `deliverPurchase`/payment-approval Plans coverage above,
  and wiring either suite to CI.
- **Where:** `gymvyn-backend/tests/adminRoutesAuth.test.js`,
  `gymvyn-backend/tests/userDeletionCascade.test.js`,
  `gymvyn-backend/tests/plansAdminAuth.test.js` (new),
  `gymvyn-backend/tests/plansRoutes.test.js` (now wired into `npm test`),
  `gymvyn-backend/package.json`, `gymvyn-backend/scripts/seed-test-ecosystem.js` (fixed);
  `gymvyn-admin/vitest.config.js`, `gymvyn-admin/src/test/setup.js`,
  `gymvyn-admin/src/lib/adminApi.test.js`, `gymvyn-admin/src/components/ProtectedRoute.test.jsx`,
  `gymvyn-admin/package.json` (`test` = `vitest run`); `gymvyn-plans/package.json`
  (`test` = build + `tests/rendered-html.test.mjs`); `gymvyn-frontend/tests/*.spec.js`,
  `gymvyn-frontend/scripts/run-e2e.cjs` (new), `gymvyn-frontend/package.json`
  (`test:e2e` = `node scripts/run-e2e.cjs`), `gymvyn-frontend/playwright.config.js`
  (`testIgnore` now excludes `*.test.js` — those are the separate `node --test` suite
  that lives in the same `tests/` directory; Playwright's default `testMatch` was also
  collecting and executing them as a side effect, confirmed via the `--list` run above).
- **Why it matters:** The least-tested surfaces are the security-sensitive ones (admin
  mutations, money delivery). Tests that need a hand-seeded stack rot.

### 3. No global input/schema validation on money & quantity fields — MOSTLY FIXED 2026-07-24
- **What:** `plansRoutes.js` validates its own inputs well (price floors, integer
  checks); server.js had a `validate(zod schema)` helper already, but only wired up to
  the membership-plan routes. Surveyed every other money/quantity field backend-wide
  (`grep`-driven, not marketplace routes). **Three real gaps found across two passes**:
  (1) staff and trainer payout creation only checked `amount != null` — a negative
  amount was inserted as-is into the payouts ledger, and a non-numeric amount (e.g. a
  string) silently became `null` on JSON serialization (`Number('abc')` → `NaN` →
  dropped by `JSON.stringify`); (2) the bulk member-CSV importer's `monthly_fee` column
  only checked `Number.isFinite`, so a row with `monthly_fee: -500` passed validation as
  "a valid number" and got written straight into `gym_memberships.monthly_fee` — no
  floor check existed anywhere in `normalizeImportRow`; (3) `validate()`'s zod schemas
  used the zod v3 option names (`invalid_type_error`, `errorMap`) but the repo runs
  `zod@^4.4.3`, which silently ignores both — every custom "X must be a number" message
  in `membershipPlanCreateSchema` and the two `payoutSchema`s was never actually shown;
  callers always got zod's generic fallback message instead (still a 400 with a
  reasonable message, so not a security gap — just wrong text).
- **Fixed:** Extracted server.js's inline `validate(schema)` into
  `src/utils/validate.js` so route modules elsewhere can reuse it. Added zod schemas to
  `routes/staffEarningsRoutes.js` and `routes/trainerEarningsRoutes.js`'s `POST /payout`
  routes (amount: positive, finite, capped at ₹10,00,000, matching the membership-plan
  price cap). Added a negative-value check to `services/memberImportService.js`'s
  `normalizeImportRow` (`monthlyFee < 0` now pushes a row-level validation error, same
  path as an invalid phone/email — the whole row is rejected with `VALIDATION_ERROR`
  instead of silently importing a negative fee), with a regression test in
  `tests/memberImportService.test.js`. Fixed all four `invalid_type_error`/`errorMap`
  occurrences (`server.js` ×2, `staffEarningsRoutes.js`, `trainerEarningsRoutes.js`) to
  the zod v4 `{ error: '...' }` form. **Standardized the rest of the money/quantity
  fields onto `validate()` + zod** (2026-07-24), replacing their ad hoc `Number()`/
  if-check validation with the same pattern, now that a gap was actually found in that
  style of check: `routes/lockerRoutes.js` (`POST /` — `price` required only when
  `is_paid` is true, enforced via `.refine()`), `routes/expenseRoutes.js` (`POST /` and
  `PATCH /:id` — category enum, positive `amount`, PATCH keeps its "no valid fields to
  update" 400 via `.refine()`), and `server.js`'s `POST /api/gym-members/:memberId/renew`
  (new `membershipRenewSchema`). `routes/supplementRoutes.js`'s per-item quantity loop
  was deliberately left as hand-written — it already validates correctly and gives a
  precise per-product-id error message that a single zod array schema would only
  reproduce with meaningfully more code for no behavioral gain. Verified every converted
  route live against a real seeded gym-owner session (negative price/amount, missing
  required field, bad enum value, empty PATCH body) — each now 400s with the intended
  message — then re-ran the full backend suite (209/210, 1 pre-existing skip).
- **Still open:** not an exhaustive backend-wide validation layer — a new money/quantity
  field added to a route that isn't one of the ones listed above still won't be
  schema-validated by default. `payoutSchema`/`lockerCreateSchema`/`expenseCreateSchema`
  are the templates to copy for new routes.
- **Where:** `gymvyn-backend/src/utils/validate.js`,
  `gymvyn-backend/routes/staffEarningsRoutes.js`,
  `gymvyn-backend/routes/trainerEarningsRoutes.js`,
  `gymvyn-backend/routes/lockerRoutes.js`, `gymvyn-backend/routes/expenseRoutes.js`,
  `gymvyn-backend/services/memberImportService.js`,
  `gymvyn-backend/tests/memberImportService.test.js`, `gymvyn-backend/server.js`.
- **Why it matters:** Negative/overflow amounts, wrong-currency values, and malformed
  enums can corrupt ledgers and reports.

---

## LOW

None open — the last LOW items (FitForge rename, `graphify` dependency placement,
tooling-convention documentation, misc log/doc residue) were closed 2026-07-24; see
"Previously flagged, now RESOLVED" below.

---

## Half-finished work / migrations in flight

- **Plans marketplace payments** — model reworked as of 2026-07-23; item 1 needs a full
  re-audit before any further security work there. Don't assume the 2026-07-22 write-up
  still describes the current implementation.
- **`gymvyn-admin`** — the anon-key data path, admin-identity gate, README, and
  exercise-editing writes are now fixed (see resolved items below), and it now has a
  starter `vitest` suite covering `adminApi.js` and `ProtectedRoute.jsx` (item 2) — still
  no coverage for the individual pages (`Users.jsx`, `Dashboard.jsx`, etc.).
- **Dark-mode audits** — `docs/DARK_MODE_AUDIT.md`, `docs/DARK_MODE_UNRESOLVED.md`,
  `docs/DARK_MODE_VISUAL_ISSUES.md`, `docs/ICON_*` (moved out of the frontend root
  2026-07-24, see resolved items below) are a backlog, not settled state.

---

## Previously flagged, now RESOLVED (do not re-report as open)

### ChatGPT-app integration for `gymvyn-plans` — verified: doesn't exist, not a live risk (verified 2026-07-24)
- **What the audit asked:** "`app/chatgpt-auth.ts` + `.openai/` exist; verify the
  sign-in/callback routes (`/signin-with-chatgpt`, `/callback`) are fully wired and that
  the ChatGPT identity is reconciled with a Supabase account before any purchase."
- **What was actually found:** This isn't a half-wired feature — it's unused
  starter-template scaffolding that was never wired up at all. Traced every consumer of
  `getChatGPTUser()`/`requireChatGPTUser()`/`chatGPTSignInPath()`/`chatGPTSignOutPath()`
  (`app/chatgpt-auth.ts`) and found **zero callers anywhere** in the repo. None of the
  three paths it defines (`/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`)
  have a route implementing them — no `route.ts`, no page, and there's no
  `middleware.ts` in the project at all. `worker/index.ts` (the Cloudflare Worker entry
  point) only intercepts `/_vinext/image` for image optimization and delegates
  everything else straight to the standard Next.js app router — no ChatGPT-specific
  routing at the infra level either. `.openai/hosting.json` is an empty
  `{"d1": null, "r2": null}` stub. No `@openai/*`/Apps-SDK dependency in `package.json`,
  no mention of ChatGPT in the README, and both files were added in the single initial
  scaffolding commit ("Create Gymvyn Plans website and seller portal") and never touched
  since (`git log` confirms one commit total for each). Grepped
  `gymvyn-backend`/`gymvyn-admin`/`gymvyn-frontend` too — nothing anywhere references
  these paths or the `oai-authenticated-user-*` headers.
  - **The real, live purchase flow** (`app/plans/[slug]/PlanPurchasePanel.tsx`) uses
    plain Supabase email/password auth (`getSupabaseClient()`,
    `signInWithPassword`/`signUp`) — completely independent of the ChatGPT code path.
    So the audit's actual question — "is the ChatGPT identity reconciled with a Supabase
    account before purchase" — doesn't apply: there is no ChatGPT identity anywhere in
    the purchase flow to reconcile.
- **Worth knowing, not fixed (repo owner chose to document only, not remove or build
  out, 2026-07-24):** `getChatGPTUser()` trusts the `oai-authenticated-user-email`
  request header outright with no signature or origin verification — a confused-deputy
  pattern (only safe if this app is exclusively reachable behind OpenAI's own
  authenticating proxy). Not exploitable today since nothing calls it, but if anyone
  wires this up later without adding that verification, a direct HTTP request could
  spoof the header and impersonate any ChatGPT user. Left as-is per the repo owner's
  choice — files are untouched scaffolding for possible future use, not currently live.
- **Where:** `gymvyn-plans/app/chatgpt-auth.ts`, `gymvyn-plans/.openai/hosting.json`
  (unchanged — kept as-is, not removed).

### Miscellaneous residue: debug log leftover + audit-file clutter (fixed 2026-07-24)
- **What it was:** Three things bundled under one LOW item: (1) `console.log`/
  `console.error` "remain throughout the backend"; the one concrete example given was
  `src/routes/ai.js` logging `req.userId`; (2) historical `.md` audit files
  (`DARK_MODE_*`, `ICON_*`) cluttering the frontend repo root, making it hard to tell
  current docs (`CLAUDE.md`/`PROJECT.md`/`GAPS.md`) from a stale backlog at a glance;
  (3) an untracked `.env.development.local` referencing `VERCEL_OIDC_TOKEN`.
- **(1) investigated, not blanket-fixed:** Grepped the backend for `console.log`/
  `console.error` outside `tests/`/`scripts/` — 325 occurrences. The overwhelming
  majority are legitimate `catch (err) { console.error('ROUTE error:', err); ... }`
  production error logging (useful for debugging, not noise) — gating all of them
  behind `NODE_ENV !== 'production'` would make production debugging *worse*, not
  better, and was rejected as the wrong fix for a LOW-severity cleanup touching
  hundreds of call sites. Grepped specifically for debug-marker-style logs (`===`,
  "REACHED", etc.) and secret/token/password logging (none found beyond the one
  example) — the *only* real match was the exact one the audit named:
  `src/routes/ai.js`'s `POST /voice/diet` handler unconditionally logged
  `'=== VOICE DIET HANDLER REACHED ==='`, the uploaded file's size/mimetype, and
  `req.userId` on every request, adding zero operational value in production and
  needlessly printing a user identifier. Removed those 3 lines (not gated — pure
  leftover debug noise with no legitimate use, so deleting is more honest than gating).
- **(2) fixed:** Moved the 5 audit files (`DARK_MODE_AUDIT.md`, `DARK_MODE_UNRESOLVED.md`,
  `DARK_MODE_VISUAL_ISSUES.md`, `ICON_CONTAINER_AUDIT.md`, `ICON_DIAGNOSIS.md`) into a
  new `docs/` folder via `git mv` (proper renames, history preserved) — not
  `docs/history/` as originally suggested, since `GAPS.md`'s own "Half-finished work"
  section already correctly flags these as an **active, unresolved backlog**, not
  archived/dead notes; a `history/` name would misrepresent their status. Updated the
  two comment references in `tests/dark-mode-runtime.spec.js` and `PROJECT.md`'s
  gotchas bullet to point at the new path. While touching that exact `PROJECT.md`
  bullet, also removed an adjacent stale claim it still carried — "`apiFetch` swallows
  the server's error message" — which this same audit already found and fixed to be
  wrong on 2026-07-23 (see the `apiFetch` resolved entry below); `PROJECT.md` had never
  been updated to match.
- **(3) confirmed a non-issue:** `.env.development.local` is `git check-ignore`d and
  `git ls-files` confirms it was never tracked — exactly as the original note said. No
  action needed; not re-flagging.
- Verified: `node --check src/routes/ai.js`; backend `npm test` 209/210 (1 pre-existing
  skip); frontend `npm run build` and `npm test` (39/39) clean; `git status --short`
  confirms all 5 file moves are proper `R` renames, not delete+add.
- **Where:** `gymvyn-backend/src/routes/ai.js`;
  `gymvyn-frontend/docs/DARK_MODE_AUDIT.md`, `docs/DARK_MODE_UNRESOLVED.md`,
  `docs/DARK_MODE_VISUAL_ISSUES.md`, `docs/ICON_CONTAINER_AUDIT.md`,
  `docs/ICON_DIAGNOSIS.md` (moved from repo root), `gymvyn-frontend/PROJECT.md`,
  `gymvyn-frontend/tests/dark-mode-runtime.spec.js`.

### Repos disagree on tooling and conventions — acknowledged, fix criteria already met (closed 2026-07-24)
- **What it was:** Frontend/backend/admin are JS; plans is TS. Admin lints with
  **oxlint**; the others use **eslint**. Plans is Next-on-Cloudflare; the rest are
  Vite/Node. Each repo re-implements its own tiny API-fetch helper (`apiFetch`,
  `plansAdminApi.js`'s `authedFetch`, `adminApi.js`'s `authedFetch`, `lib/api.ts`'s
  `apiGet`).
- **Why this isn't a code fix:** The item's own suggested fix was explicitly "don't
  unify — follow each repo's local conventions, and document the split" (unifying
  tooling across repos with genuinely different runtimes — Next-on-Cloudflare vs.
  Vite/Node — would be the wrong move, not a cleanup). That documentation already
  exists: `CLAUDE.md`'s repo table names each repo's stack/lint tool, the admin section
  spells out "lint with oxlint (not eslint)", the plans section notes TypeScript +
  Next-on-Cloudflare, and the "Gotchas" section has an explicit "Tooling differs per
  repo" bullet. Re-verified all four references are present and accurate. Closing as
  satisfied rather than leaving it open with nothing actionable — don't re-report unless
  the documentation itself goes stale or a new repo joins the ecosystem undocumented.
- **Where:** `gymvyn-frontend/CLAUDE.md` (no code changes).

### `graphify` was listed as a runtime `dependencies` entry instead of `devDependencies` (fixed 2026-07-24)
- **What it was:** `graphify` (a codebase-analysis/knowledge-graph CLI tool, used via
  the `graphify` skill for exploration — see this repo's `CLAUDE.md` — not imported by
  app code) was listed under `dependencies` in `gymvyn-frontend/package.json`.
- **Confirmed before fixing:** grepped `src/**` for any `import`/`require` of `graphify`
  — none. It's invoked as a CLI (evidenced by `graphify-out/` output directories from
  prior sessions), not bundled into the shipped app; Vite only bundles what's actually
  imported, so this was a classification error, not a build-time issue.
- **Fix applied:** Moved `graphify` from `dependencies` to `devDependencies` in
  `package.json`, ran `npm install` to sync `package-lock.json` (confirmed via the
  lockfile's `packages[""].devDependencies` and the `node_modules/graphify` entry's
  `dev: true` flag), and re-ran `npm run build` to confirm the production bundle is
  unaffected. No `vercel.json` build override or `postinstall`/`preinstall` script
  depends on a production-only install, so this doesn't change what's available at
  build time either.
- Verified: `npm install` (lockfile now marks `graphify` as dev-only),
  `npm run build` clean (same pre-existing chunk-size/dynamic-import warnings, nothing
  new).
- **Where:** `gymvyn-frontend/package.json`, `gymvyn-frontend/package-lock.json`.

### FitForge → Gymvyn rename — safe parts renamed, rest frozen+documented (fixed 2026-07-24)
- **What the audit claimed:** Backend git remote is `fitforge-backend.git`;
  `FRONTEND_URL` defaults to a `fitforge-*.vercel.app` host; Cloudinary folder is
  `fitforge/progress`; the ML service self-names "FitForge ML"; `ff_`→`gv_` localStorage
  migration still lives in `useAuth.jsx`.
- **Investigated first** (two of the five claims were already stale, same lesson as the
  `apiFetch` and RLS findings elsewhere in this doc): `FRONTEND_URL`'s default is already
  `https://gymvyn-frontend.vercel.app` (`server.js:31`), and the progress-photo
  Cloudinary folder is already `gymvyn/progress` (`server.js:142`) — neither needed a
  change. Grepped every repo (backend, frontend `src/`, native `capacitor.config.ts` +
  `AndroidManifest.xml`, and `gymvyn-ml`) for every remaining `fitforge`/`FitForge`
  occurrence and classified each one:
  - **Cosmetic (renamed):** `server.js`'s startup log line; `gymvyn-ml/app/main.py`'s
    FastAPI `title`/`description`, logger name, and startup/shutdown log lines (none of
    these are read by any other service — `ML_SERVICE_URL` + `X-Internal-Key` is the
    real contract between backend and ML, not this string); `TrainerCodeCard.jsx` /
    `GymCodeCard.jsx` / `AddMemberModal.jsx`'s `fitforge:trainer:…` / `fitforge:gym:…` /
    `'fitforge'` QR-code payload prefixes (grepped the whole frontend, native manifests,
    and the deep-link scheme config — nothing anywhere parses these back; the real
    trainer/gym join flows use typed codes via `POST /api/trainer/join`, not QR
    scanning, so these were write-only decorative strings); `GymMembers.jsx`'s CSV
    export filename.
  - **A real, low-risk data-folder rename:** `routes/supplementRoutes.js`'s product-image
    Cloudinary `folder: 'fitforge/supplements'` → `gymvyn/supplements`. Confirmed safe
    the same way the earlier progress-photo folder rename was: the upload is
    `overwrite: true` with a deterministic `public_id`, and the row is always updated
    with whatever `secure_url` Cloudinary returns (`image_url: result.secure_url`) — no
    code anywhere assumes the literal folder path, so existing product images keep
    their already-stored URLs and only *new* uploads land in the new folder (matching
    exactly how `gymvyn/progress` was migrated previously).
  - **Deliberately left alone (live infrastructure or still-needed shims — not a code
    fix's call to make):**
    - The GitHub repo name (`origin` → `github.com/artazzzzzzz/fitforge-backend.git`)
      and the Railway production hostname
      (`fitforge-backend-production-1c93.up.railway.app`, referenced as a script
      default in `scripts/test-api-sweep.js`). Renaming either is an infrastructure
      decision (breaks existing clone URLs / CI hooks / the connected Railway service)
      that needs the repo owner's explicit action, not something to change as a
      LOW-severity doc-cleanup task.
    - `useAuth.jsx`'s `ff_`→`gv_` localStorage migration — this is a live,
      **self-disabling** one-time shim (guarded by a `gv_keys_migrated` flag), not dead
      code. It still matters for any browser that hasn't opened the app since the
      original rename. Removing it would silently drop onboarding/role state for those
      users.
    - The `@fitforge.test` seeded test-fixture email domain
      (`scripts/seed-test-ecosystem.js`, `tests/*RoutesAuth.test.js`, etc.) — renaming
      would mean deleting and recreating 19 real Supabase Auth accounts the whole test
      suite depends on, for a purely cosmetic win. Not worth the risk for a LOW item.
    - One-off, already-run maintenance scripts (`scripts/add-remaining-exercises.js`'s
      `folder: 'fitforge/exercises'`, `scripts/uploadExerciseVideos.js`, etc.) — these
      aren't hot paths and re-running them against a renamed folder could split existing
      uploaded assets across two folders for no benefit.
- Verified: `node --check server.js routes/supplementRoutes.js`;
  `python3 -m py_compile app/main.py` (gymvyn-ml); frontend `npm run build` and
  `npm test` (39/39) clean; backend `npm test` (209/210, 1 pre-existing skip) clean.
- **Where:** `gymvyn-backend/server.js`, `gymvyn-backend/routes/supplementRoutes.js`,
  `gymvyn-ml/app/main.py`, `gymvyn-frontend/src/components/TrainerCodeCard.jsx`,
  `gymvyn-frontend/src/components/GymCodeCard.jsx`,
  `gymvyn-frontend/src/components/AddMemberModal.jsx`,
  `gymvyn-frontend/src/pages/gym/GymMembers.jsx`.

### `plansRoutes.js` admin suspend/remove were 501 stubs while a real admin guard existed (fixed 2026-07-24)
- **What it was:** `POST /api/plans/admin/listings/:id/suspend` and `/remove` were wired
  to `adminGuardUnavailable` (always returned 501, "admin authorization is not
  configured yet"), with a comment claiming no reusable admin guard existed — but
  `requireAdminPlans` (a `PLANS_ADMIN_EMAILS` allowlist gate, separate from the
  platform-wide `ADMIN_EMAILS` used by `/api/admin/*`) was already defined a few lines
  above and already used by `GET /admin/purchases` and
  `POST /admin/purchases/:id/approve` in the same file — the stub comment was stale
  relative to the code around it. Re-read the whole file before touching it (per the old
  item 1 caveat about the marketplace being reworked) and confirmed the rest of
  `plansRoutes.js` still matches its documented shape — Razorpay order creation behind
  `PLANS_PAYMENTS_ENABLED`, manual `deliverPurchase()` via admin approval, no webhook —
  so item 1 (payment-verification re-audit) is unaffected by this fix and still open.
- **Fix applied:** Replaced `adminGuardUnavailable` on both routes with
  `auth, requireAdminPlans`. The Phase 1 schema had already reserved exactly the columns
  this needed (`plans_listings.status` CHECK already included `'suspended'`/`'removed'`,
  plus `suspended_at`/`removed_at`/`moderation_reason` columns) — no migration required.
  Added a small shared `moderateListing()` helper: suspend/remove both 404 on an unknown
  listing id, write the matching `*_at` timestamp and an optional `reason` (trimmed,
  capped at 500 chars) from the request body, and update `updated_at`; suspend
  additionally 409s if the listing was already `removed` (terminal state). No admin UI
  was added in `gymvyn-admin` for this — GAPS only called for the backend fix, and no
  `Listings`-moderation page exists yet to wire it into.
- Verified: `node --check routes/plansRoutes.js`; added
  `tests/plansAdminAuth.test.js` (401/403 coverage for both new routes, mirroring
  `adminRoutesAuth.test.js`'s convention — see the item 2 test-coverage entry below);
  full backend `npm test` 209/210 (1 pre-existing skip).

### `gymvyn-admin` read PII directly from Supabase with the anon key (fixed 2026-07-22)
This was CRITICAL item 1 in the prior audit. Verified against the live Supabase project
(`Fit-ForgePhase-1`, `jaxnqttycxeavwhcsoyv`) rather than assumed:

- **RLS was already enabled on every `public` table** (the earlier "RLS effectively
  absent" note was wrong — see the "RLS coverage" resolved entry below for the accurate,
  narrower version of that finding).
- The real, **live** hole: `users` and `workout_logs` each had a `SELECT` policy with
  `USING (true)` for the `authenticated` role — i.e. **any signed-in Gymvyn user of any
  role**, not just the admin, could read every other user's full profile (phone, age,
  weight, height, injuries, goals) and complete workout history directly via the anon key
  and their own session token. This was broader than "the admin panel is insecure" — it
  was an app-wide horizontal access-control gap. Confirmed no frontend code relied on the
  broad grant (all direct client reads were already scoped to `auth.uid()`; cross-user
  reads like leaderboard/community already went through the backend).
- **Fix applied:**
  1. Dropped both overly-broad policies via Supabase migration
     `tighten_users_workout_logs_select_rls` — own-row access remains intact via the
     existing `auth.uid() = id` / `auth.uid() = user_id` policies.
  2. Added `routes/adminRoutes.js` (`/api/admin/*`) on the backend, gated by a new
     `requireAdmin` middleware (`middleware/auth.js`, `ADMIN_EMAILS` env allowlist,
     fail-closed if unset) using the service-role client — so admin data access no longer
     depends on RLS at all.
  3. Extracted the account-deletion cascade into `src/utils/userDeletion.js`
     (`deleteUserCascade`), used by both the self-service `DELETE /api/users/:userId` and
     the new admin delete route, so there's one tested implementation of a destructive
     multi-table operation instead of two copies that could drift.
  4. Rewired `gymvyn-admin`'s `Users.jsx`, `UserDetail.jsx`, `Dashboard.jsx`, and
     `AIMonitor.jsx` to call the new backend endpoints (`src/lib/adminApi.js`) instead of
     the anon Supabase client. `Exercises.jsx`'s *read* path was left as-is — that table
     is intentionally public-read (`SELECT` policy `true` for the `public` role) and
     isn't PII — but its *write* path turned out to be broken for an unrelated reason;
     see the "exercise create/edit/delete" resolved entry below.
  5. As a side effect, this also fixed a **functional** bug: `AIMonitor.jsx`'s feature-flag
     toggles and vision-cache stats/clear previously ran through the anon key against
     tables with RLS-enabled-but-zero-policies (deny-all — see the "RLS coverage" resolved
     entry below), so they silently did nothing. They now work via the backend's
     service-role client.
- Verified: backend `npm test` (165/165 passing), `npm run build`/`npm run lint` clean in
  `gymvyn-admin`, and `curl` confirms every `/api/admin/*` route (including `DELETE`)
  rejects requests with no/invalid token.

### RLS coverage: deny-all tables documented as backend-only by design (fixed 2026-07-23)
- **What it was:** Six tables (`feature_flags`, `food_vision_cache`, `user_flags`,
  `friendships`, `user_blocks`, `imported_gym_members`) have RLS enabled with zero
  policies — deny-all for any direct anon/authenticated Supabase client. Not a security
  gap (fails closed), but easy to mistake for a bug rather than intent, and nothing
  previously recorded *why* these are policy-less.
- **Fix applied:** Confirmed no frontend code (main app or admin) reads/writes any of
  these six tables directly — everything goes through the backend's service-role client,
  which bypasses RLS entirely. Added a `COMMENT ON TABLE` to each in Supabase
  (migration `document_backend_only_deny_all_tables`) recording that the deny-all state
  is intentional and naming the backend route file responsible for each. No policies were
  added — there's no direct-client consumer to grant access to; if one is ever built, add
  a real scoped policy at that time.
- **Found while verifying this:** `gymvyn-admin/src/components/AlertsBanner.jsx` (missed
  in the original item-1 sweep — a fourth file, after Dashboard/Users/UserDetail/
  AIMonitor/Settings) was still reading `ai_requests` and `users` directly via the anon
  key for its dashboard alert thresholds (today's AI cost, per-feature error rate, users
  missing a calorie goal, per-user AI request count). Same regression pattern as the
  `Settings.jsx` fix: `ai_requests` SELECT is scoped to `auth.uid() = user_id`, so the
  admin's queries returned only their own (near-empty) data instead of platform-wide
  totals — the alert banner was silently showing nothing, or wrong numbers, instead of
  real warnings. Fixed by adding `GET /api/admin/alerts` to `routes/adminRoutes.js`
  (service-role queries, same `requireAdmin` gate) and rewiring `AlertsBanner.jsx` to
  call it via `adminApi.js`.
- **Also found, not fixed here:** `Exercises.jsx`'s *write* path (create/edit/delete) is
  likely broken for an unrelated reason — see the "exercise create/edit/delete" resolved
  entry below.
- Verified: backend `npm test` (191/192 passing, 1 pre-existing skip), `curl` confirms
  `/api/admin/alerts` 401s with no/invalid token, `gymvyn-admin` `npm run build`/`lint`
  clean, `obj_description()` confirms all six table comments applied in Postgres.

### `gymvyn-admin`'s exercise create/edit/delete was silently broken by RLS deny-all (fixed 2026-07-23)
- **What it was:** `gymvyn-admin/src/pages/Exercises.jsx` wrote directly to `exercises`
  and `exercise_metadata` via the anon Supabase client (`insert`/`upsert`/`delete`). Both
  tables have RLS enabled with only a public `SELECT` policy — confirmed live via
  `pg_policies` — no `INSERT`/`UPDATE`/`DELETE` policy on either. RLS defaults to deny
  when no policy matches a command, so every write this page attempted was silently
  blocked by Postgres (add/edit/delete all appeared to do nothing, or surfaced a bare
  Postgres permission error). Not a security hole — deny-all fails safe, the same class
  as the "RLS coverage" entry above — but a real admin-console feature was non-functional.
- **Fix applied:** Added `POST /api/admin/exercises`, `PATCH /api/admin/exercises/:id`,
  and `DELETE /api/admin/exercises/:id` to `routes/adminRoutes.js` (service-role client,
  same `auth, requireAdmin` gate as every other admin route). The handlers own the
  `exercises` row write and the paired `exercise_metadata` write (instructions/pro-tip)
  together, including renaming `exercise_metadata.exercise_name` when an edit changes the
  exercise's name, and deleting both rows on delete. Rewired `Exercises.jsx`'s
  `handleSave`/`handleDelete` to call these through new `createExercise`/`updateExercise`/
  `deleteExercise` wrappers in `src/lib/adminApi.js`, matching every other admin page's
  pattern. Left `Exercises.jsx`'s *reads* (list, filters, the edit modal's metadata
  fetch) on the anon client — that table is intentionally public-read and isn't PII, so
  the read path was never broken. Did **not** add write RLS policies to `exercises`/
  `exercise_metadata` — that would let any signed-in Gymvyn user, not just the admin,
  tamper with the shared exercise database.
- Verified: backend `npm test` (191/192 passing, 1 pre-existing skip, same baseline);
  `gymvyn-admin` `npm run build` and `npm run lint` clean (two pre-existing unused-var
  warnings in `Exercises.jsx`/`UserDetail.jsx` unrelated to this change).

### Admin identity was a hardcoded frontend email, separate from the backend allowlists (fixed 2026-07-22)
- **What it was:** `gymvyn-admin/src/components/ProtectedRoute.jsx` gated the whole
  console on a hardcoded `session.user.email === 'adminceo@gmail.com'`, a separate source
  of truth from the backend's `PLANS_ADMIN_EMAILS`/`ADMIN_EMAILS` allowlists.
- **Fix applied:** Added `GET /api/admin/whoami` (behind `auth` + `requireAdmin`) to
  `routes/adminRoutes.js`; `ProtectedRoute.jsx` now calls it instead of comparing emails
  itself — a 200 means admin, anything else redirects to `/login`. The hardcoded email
  literal is gone from the frontend bundle.
- **Note:** `PLANS_ADMIN_EMAILS` (marketplace moderation) and `ADMIN_EMAILS` (platform
  admin, used by `/api/admin/*`) remain two intentionally separate allowlists — a
  marketplace moderator need not be a full platform admin. Revisit only if that stops
  being true in practice.
- Verified: `curl` confirms `/api/admin/whoami` 401s with no/invalid token; backend
  `npm test` (165/165 passing); `gymvyn-admin` `npm run build`/`lint` clean.

### `apiFetch` discarding server error detail — already fixed, audit was stale (found 2026-07-23)
- **What the audit claimed:** `apiFetch` threw `new Error(\`API error ${res.status}\`)`,
  dropping the JSON `message`/`error` the backend returns, inconsistent with the other
  request helpers.
- **Actual state:** Already fixed — `gymvyn-frontend/src/utils/api.js`'s `apiFetch` throws
  `data.error || data.message || \`API error ${res.status}\`` today, exactly matching the
  fix this item called for. Traced via `git log -S` to commit `61d7035` ("feat: add
  backend URL env variable"), which predates this GAPS.md rewrite — the finding was
  carried forward from the original 2026-07-07 audit without re-verifying against current
  code. Grepped the rest of `src/` for the old buggy literal (`` API error ${res.status} ``)
  and found no remaining occurrences anywhere.
- **Lesson:** same failure mode as the "RLS effectively absent" claim (see the CRITICAL
  item-1 writeup above) — don't trust an inherited audit line without re-checking the
  live file. No code change was needed here.

### `gymvyn-admin/README.md` had an unresolved git merge conflict (fixed 2026-07-23)
- **What it was:** The README was raw, unresolved conflict markers (`<<<<<<< HEAD` /
  `=======` / `>>>>>>>`) mixing a default Vite template README with a default GitLab
  starter README — neither side described the actual app.
- **Fix applied:** Replaced with a real README: what the console is, setup/env vars, the
  backend-vs-anon-key data-access split, the `/api/admin/whoami` auth model, and a
  page-by-page reference table.
- **Found while fixing this:** `Settings.jsx`'s "Platform Stats" and "Database Health"
  sections were still reading `users`/`workout_logs`/`food_logs`/`ai_requests`/
  `progress_entries`/`xp_events`/`user_xp` directly via the anon key for row counts — this
  file was missed in the original item-1 audit. It wasn't a new security hole (the
  opposite: dropping the overly-broad `users`/`workout_logs` SELECT policies for item 1
  meant these counts silently went from "everyone's data" to "wrong/undercounted," since
  an anon-key `count` query is now RLS-scoped to the caller's own row). Confirmed directly
  in Postgres: real `users` count is 133; under RLS as a plain authenticated caller it's
  far lower. Fixed by adding `GET /api/admin/platform-stats` to `routes/adminRoutes.js`
  (service-role counts, same `requireAdmin` gate) and rewiring both `Settings.jsx`
  sections to call it via `adminApi.js` instead of the anon Supabase client.
- Verified: backend `npm test` (165/165 passing), `curl` confirms
  `/api/admin/platform-stats` 401s with no/invalid token, `gymvyn-admin`
  `npm run build`/`lint` clean.

### `ml_client.js` defaulted its shared secret to a public placeholder (fixed 2026-07-22)
- **What it was:** `ML_INTERNAL_KEY` defaulted to the literal string
  `'change-me-to-random-string'` if unset, so a misconfigured deployment would use a
  secret published in this repo.
- **Fix applied:** The key is now read per-call with no default; `mlRequest` throws
  `ML_INTERNAL_KEY is not configured` if it's missing. Checked at call time (inside
  `mlRequest`), not at module load, since every caller (`GET /api/ml/status`,
  `POST /api/ml/score/:gymId`, the nightly churn-scoring cron) already treats the ML
  service as optional with a fallback and wraps the call in try/catch — a missing key now
  fails that one call instead of crashing the whole backend at boot.
- Verified: `node --check ml_client.js`; backend `npm test` (165/165 passing, no test
  exercises the ML client directly).

### Backend/frontend items from the 2026-07-07 audit
- **Unauthenticated account takeover via `change-password`** — now `authLimiter, auth` +
  ownership (`server.js`).
- **Broad IDOR across the inline monolith** — **81 of 82 inline routes now run `auth`**
  (only `GET /health` is open) with real ownership/role checks (`req.user.id === userId`,
  `isGymOwner || active staff`) and field allowlists on updates.
- **Wide-open CORS** — replaced with `cors({ origin: <allowlist + localhost pattern> })`.
- **Divergent auth middleware** — consolidated: `middleware/auth.js` is the single source
  (sets `req.user` + `req.userId`), and `src/routes/ai.js` / `routes/staffRoutes.js` now
  import it instead of defining copies.
- **Divergent auth middleware, round 2 (2026-07-23)** — the first consolidation pass
  missed 14 more files that still defined their own copy of the same Bearer-token +
  `supabase.auth.getUser()` logic: `routes/gymRoutes.js`, `exerciseRoutes.js`,
  `expenseRoutes.js`, `supplementRoutes.js`, `clientDietPlanRoutes.js`,
  `trainerEarningsRoutes.js`, `measurementRoutes.js`, `classBookingRoutes.js`,
  `lockerRoutes.js`, `equipmentRoutes.js`, `dietPlanRoutes.js`,
  `trainerDietPlanFoodRoutes.js`, and `src/routes/reportsRoutes.js` / `xpRoutes.js` /
  `gymFeedRoutes.js`. All now import `auth` from `middleware/auth.js`.
  `src/routes/gymFeedRoutes.js` needed a thin wrapper (`baseAuth` + a role-lookup step)
  since it attaches `req.user.role` on top of the base check. `routes/plansRoutes.js`
  and the marketplace subsystem were left untouched (out of scope, reworked recently).
  Verified: `npm test` (191/191 passing, 1 skipped, same as baseline) both before and
  after; all touched route modules `require()` cleanly with env loaded.
- **Two active trainer route files** — the root `trainerRoutes.js` was deleted; only
  `routes/trainerRoutes.js` (`/api/trainer`) remains.
- **Frontend `.env` committed to git** — no longer tracked (`git ls-files` clean).
- **No backend automated tests** — a `node --test` suite exists (`npm test` runs auth,
  trainer-auth, diet-plan-auth, plans, chat-security, friends, food resolver, etc.).
- **No rate limiting** — `express-rate-limit` `globalLimiter` + `authLimiter` are in place.
- **Debug/preview leftovers** — the `>>> HTTP` request logger and the `/preview-exercise`
  DEV route are gone.
- **`axios` unused dependency** — removed from the frontend.
