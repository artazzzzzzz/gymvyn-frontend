# CLAUDE.md — gymvyn-frontend

Operational guide for working in this repo and its siblings. For architecture/"why",
read [PROJECT.md](PROJECT.md). For known bugs and security holes, read [GAPS.md](GAPS.md).

- **PROJECT.md** — what Gymvyn is, the 6-service ecosystem, role model, data flows,
  critical paths.
- **GAPS.md** — ordered audit of current weaknesses; **read items 1–3 before touching
  the admin app, RLS, or Plans payments.** (It also lists what's already fixed — don't
  re-report resolved items.)

This is the **frontend** repo (React SPA + Capacitor native). Related repos on this
machine:

| Repo | What it is | Stack | Deploy |
| ---- | ---------- | ----- | ------ |
| `gymvyn-frontend` | main app (5 roles) + native iOS/Android | React 19, Vite, Router 7, Tailwind 4, Capacitor 8, JS/JSX | Vercel + app stores |
| `../gymvyn-backend` | Express monolith, holds service-role key | Node, Express 5, CommonJS | Railway |
| `../gymvyn-admin` | internal superadmin console | React 19, Vite, oxlint, JS | Vercel |
| `../gymvyn-plans` | public trainer-plan marketplace + ChatGPT app | Next.js 16, Cloudflare Workers, Drizzle, TS | Cloudflare |
| `../gymvyn-ml` | churn prediction | Python, FastAPI, XGBoost | (via backend) |
| `../gymvyn-website` | marketing site | — | — |

Frontend + backend change together constantly — expect to edit both. The Plans
marketplace spans backend + `gymvyn-plans` + `gymvyn-admin` + the in-app `/trainer/plans`
page.

---

## Commands

### Frontend (`gymvyn-frontend`)
- Install: `npm install`
- Dev: `npm run dev` (Vite, port 5173; Playwright expects `PORT=5174 npm run dev`)
- Build: `npm run build` · Preview built: `npm run preview`
- Lint: `npm run lint` (ESLint flat config, `eslint.config.js`)
- Unit tests: `npm test` (`node --test`: authFlow, loadingState, friendsState,
  memberImportCsv, manualCheckinSearch)
- E2E: `npx playwright test` (needs backend + seeded test ecosystem — see below)
- Dark-mode tests: `npm run test:dark`; update snapshots with `npm run test:dark-update`
- **Native (Capacitor):** `npm run build` then `npx cap sync` → `npx cap open ios` /
  `npx cap open android`. `webDir` is `dist`; `appId` is `com.gymvyn.app`.

### Backend (`../gymvyn-backend`)
- Install: `npm install`
- Dev: `npm run dev` (`node --watch server.js`) · Prod: `npm start`
- **Tests exist now:** `npm test` runs a `node --test` suite (auth, trainerRoutesAuth,
  dietPlanAuth, plansRoutes, chatSecurity, friendRoutes, food resolver, etc.). Some
  (chat, plans) have `*-local-db` reset/seed scripts and `test:*` variants.
- Seed data: `node scripts/seed-test-ecosystem.js`. Manual sweeps in `scripts/`.
- Migrations: raw SQL in `migrations/`, applied via `node migrate.js` or Supabase MCP.
- Plans local E2E: `npm run test:plans-local-e2e`.

### Admin (`../gymvyn-admin`)
- `npm install` · Dev: `npm run dev` (Vite) · Build: `npm run build` · Lint:
  `npm run lint` (**oxlint**, not eslint). No test suite.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_API_URL` (backend base).

### Plans (`../gymvyn-plans`)
- `npm install` · Dev: `npm run dev` (`vinext dev`, port 3000) · Build:
  `npm run build` (`next build`) · Start: `npm run start` (`vinext start`) · Lint:
  `npm run lint` (eslint) · Test: `npm test` (build + `tests/rendered-html.test.mjs`) ·
  `npm run db:generate` (drizzle-kit).
- Env: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **Never** put `RAZORPAY_KEY_SECRET` here — backend only.

### ML (`../gymvyn-ml`)
- `uvicorn app.main:app --reload --port 8000`; `pytest`. Backend reaches it via
  `ML_SERVICE_URL` + `X-Internal-Key`.

---

## Conventions this codebase actually follows

- **Main frontend is JS + JSX, no TypeScript.** React 19, Router 7, Tailwind 4, function
  components + hooks. `PascalCase.jsx` for components/pages, `camelCase.js(x)` for
  hooks/utils. Hooks live in `src/hooks/`.
- **Directory layout:** `src/pages/*` (routed screens, grouped by role in `consumer/`,
  `staff/`, `trainer/`, `owner/`), `src/components/*` (reusable + feature subfolders like
  `diet/`, `chat/`, `progress/`, `onboarding/`), `src/hooks/*`, `src/contexts/*` (Theme,
  Cart, WorkoutSession), `src/utils/*`, `src/ai/*`, `src/data/*` (static exercise/food JSON).
- **All backend calls go through `src/utils/api.js`.** Add endpoints there; don't scatter
  `fetch` in components. Token-attaching helpers: `apiFetch`, `xpFetch`, `dietRequest`.
  **New authenticated features must use `apiFetch`/`xpFetch`.** A shrinking set of legacy
  no-token raw `fetch` calls remain.
- **Auth/session:** only via `useAuth()` (`src/hooks/useAuth.jsx`), `src/utils/supabase.js`,
  and the redirect helpers in `src/utils/authFlow.js` / `authFlowCore.js`. State is React
  context (`AuthProvider`, `ThemeProvider`, `WorkoutSessionProvider`, `XPToastProvider`,
  `CartContext`) — no Redux/Zustand.
- **Native code is isolated.** Capacitor-specific behavior (deep-link OAuth, camera) is
  gated by `Capacitor.isNativePlatform()` and lives in `NativeAuthBridge.jsx` /
  `useFoodPhotoPicker.js`. Don't sprinkle native checks elsewhere.
- **Backend:** Express 5, CommonJS. New endpoints go in a **modular route file** under
  `routes/` (or `src/routes/`) mounted in `server.js`, **with `auth`** + an
  ownership/role guard. **`routes/plansRoutes.js` is the reference for how new routes
  should look** (input validation, ownership checks, idempotency, concurrency guards).
- **Backend DB access** uses the Supabase **service-role** client, which bypasses RLS —
  so **the handler must do the auth + ownership check itself**. `middleware/auth.js`
  exports `auth`, `requireGymOwner`, `requireStaffRole`, `requireTrainerRole`; import from
  there, never re-implement.
- **Errors:** frontend helpers throw `Error`; components catch and toast. Backend returns
  `{ error }` or `{ message }` with an HTTP status.
- **Currency/locale:** rupees (₹) / paise, USD cents for Plans; Indian address fields.
  Mobile-first UI.
- **Admin app** talks to Supabase directly (anon key) for reads and to the backend for
  Plans approval; follow *its* local pattern (`lib/supabase.js`, `lib/plansAdminApi.js`),
  and lint with oxlint.
- **Plans app** is DB-less: everything comes from the backend via `lib/api.ts`,
  `lib/trainer-api.ts`, `lib/purchase-api.ts`. Don't add a real Drizzle schema unless the
  site genuinely needs its own storage.

---

## Gotchas (things that look like they should work one way but don't)

- **`useAuth.jsx` is deliberately fragile — do not "clean it up".** It subscribes only to
  `onAuthStateChange` (never `getSession()`), never `await`s inside the callback, and
  caches role/onboarding in localStorage (`gv_onboarding_<uid>`, `gv_role_<uid>`). Each is
  a fix for a real bug (auth-lock conflict, blocked token refresh, redirect loop). Read
  the comments before editing.
- **Native OAuth is a separate path.** Web returns to `/auth/callback` (a page); native
  returns to `gymvyn://auth/callback` (a deep link handled by `NativeAuthBridge`). Change
  one, check the other.
- **The backend is now mostly authenticated — but verify authZ, not just authN.** 81 of 82
  inline routes run `auth` (only `/health` is open); the residual risk is a route that
  authenticates but forgets the ownership check. When editing a handler, confirm it
  compares `req.user.id` against the target id (or checks gym ownership/staff/role), not
  just that a token was present.
- **`gymvyn-admin`'s data exposure is whatever RLS allows.** Its email gate
  (`adminceo@gmail.com`) is cosmetic; the anon key does the real reading. Don't add new
  admin reads via the anon key — route them through the backend (GAPS item 1).
- **Plans payments don't self-verify.** No Razorpay webhook exists; delivery happens only
  via admin approval (`/api/plans/admin/purchases/:id/approve` → `deliverPurchase`). Don't
  assume a `paid`/`delivered` status implies a verified payment.
- **`apiFetch` hides the server error message** (throws `API error <status>`); the other
  helpers surface `data.message`. Don't rely on `apiFetch` errors being descriptive.
- **`VITE_API_URL` must be a full origin.** `normalizeApiBase` in `api.js` prepends
  `https://` and strips trailing slashes because a bad value made every call hit the Vercel
  SPA and 405.
- **FitForge and Gymvyn are the same product.** A `fitforge` reference is often live
  (backend git remote, `FRONTEND_URL` default, Cloudinary folder, ML name) — the rename is
  unfinished. Don't assume it's dead.
- **Tooling differs per repo:** admin = oxlint; plans = TypeScript + Next-on-Cloudflare;
  everything else = eslint + JS + Vite/Node. Use the local repo's conventions.

---

## Rules

- **Never add a new unauthenticated route to `server.js`.** New endpoints go in a modular
  route file with `auth` + an ownership/role check. `/health` is the only intentional
  exception.
- **Never re-implement the auth middleware.** Import `auth` (+ `requireGymOwner` /
  `requireStaffRole` / `requireTrainerRole`) from `middleware/auth.js`.
- **Never commit secrets or `.env` files.** The backend `.env` (service key + AI keys +
  Razorpay secret) and the frontend `.env` must stay untracked (both currently are). The
  Razorpay **secret** must never reach `gymvyn-plans`.
- **Never expose or log the Supabase service-role key**, and don't move it to any frontend.
  Don't add anon-key reads of sensitive tables to the admin app.
- **Don't break `src/utils/api.js` signatures casually** — every feature depends on them.
- **When you change a backend route, check the matching `api.js` helper** (token vs
  no-token, path, method) and vice versa. For Plans, also check `gymvyn-plans/lib/*.ts`
  and `gymvyn-admin/src/lib/plansAdminApi.js`.
- **Plans money paths are load-bearing** — keep `deliverPurchase` idempotent and
  concurrency-safe; re-derive prices server-side; never trust a client-sent amount.
- **Generated / not hand-edited:** `dist/`, `node_modules/`, `package-lock.json`,
  `android/`, `ios/` (Capacitor-generated — edit via `cap sync`, not by hand),
  `tests/dark-mode-visual.spec.js-snapshots/` (regen via `npm run test:dark-update`),
  `.code-review-graph/`, `.understand-anything/`, `graphify-out/`, plans' `.next/`,
  `.wrangler/`, `.vinext/`.
- **Static data** (`src/data/exercises_by_muscle/*.json`, `exerciseDatabase.js`,
  `foodDatabase.json`) is bulk-generated/seeded — prefer regenerating over hand-editing.

---

## MCP Tools: code-review-graph

**This project has a knowledge graph. Prefer the code-review-graph MCP tools over
Grep/Glob/Read for exploration** — faster, cheaper, structural context (callers,
dependents, tests). `server.js` is ~5,365 lines; use the graph or
`grep -nE "app\.(get|post|put|patch|delete)\('/"` to find routes instead of reading it
top to bottom.

- **Explore code:** `semantic_search_nodes` / `query_graph` (`callers_of`, `callees_of`,
  `imports_of`, `tests_for`) instead of Grep.
- **Impact of a change:** `get_impact_radius` / `get_affected_flows`.
- **Code review:** `detect_changes` + `get_review_context`.
- **Architecture:** `get_architecture_overview` + `list_communities`.

The graph auto-updates on file changes via hooks. Fall back to Grep/Glob/Read when the
graph doesn't cover what you need. The backend has its own graph — run graph tools with
`repo_root=/Users/artazayaz/Desktop/gymvyn-backend` when working there.

---

## Recommended skills for this repo

Scoped to a JS/JSX React + Express + Supabase + Next-on-Cloudflare fitness app.

- **Planning/workflow:** `brainstorming`, `writing-plans`, `executing-plans`,
  `finishing-a-development-branch`, `using-git-worktrees`, `dispatching-parallel-agents`,
  `subagent-driven-development`
- **Code quality:** `code-review`, `security-review`, `review-changes`, `simplify`,
  `systematic-debugging`, `refactor-safely`, `verification-before-completion`,
  `test-driven-development`, `receiving-code-review`, `requesting-code-review`
- **Codebase exploration:** `graphify` (this repo's knowledge graph — prefer over Grep)
- **Frontend/UI:** `frontend-design` or `impeccable` (pick one), `ux-designer`,
  `make-interfaces-feel-better`, `transitions-dev`, `gsap-*` (only if animating with
  GSAP), `app-onboarding-questionnaire`, `dataviz`
- **Testing:** `webapp-testing` (Playwright)
- **Security work (GAPS remediation):** `exploitability-validation`, `redteam-hunting` —
  when auditing/fixing RLS, the admin anon-key path, or Plans payments
- **AI/LLM providers:** `claude-api` when touching `src/ai/*` or the backend AI SDKs

Off-domain skills (office-doc gen, 3D/shader/art/image-gen, C/C++ crash analysis, etc.)
are not for this repo — don't reach for them here.
