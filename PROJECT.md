# Gymvyn — Project Overview

> Onboarding doc for an engineer or AI agent new to this codebase. Read this for
> the "why" and the shape of the system. See [GAPS.md](GAPS.md) for known
> weaknesses and [CLAUDE.md](CLAUDE.md) for day-to-day operational rules.

## What this is

**Gymvyn** (formerly **FitForge** — the rename is still in progress, see below) is
a mobile-first fitness platform built as a single web app that serves **five
different kinds of user** from the same React codebase:

| Role | What they do |
| ---- | ------------ |
| **consumer** | Solo user: logs workouts, tracks diet, sees progress, earns XP, joins the community feed, uses the AI form coach. |
| **gym_member** | A consumer who has linked to a gym (via join code). Same features plus gym feed, classes, supplements, and a trainer relationship. |
| **trainer** | Manages clients, builds workout/diet templates, assigns plans, chats with clients, tracks earnings. |
| **gym_owner** | Runs a gym: members, payments, staff, schedule/classes, checkins (QR), supplements, expenses, lockers, reports, churn insights (ML). |
| **staff** | Gym employee with a permission-gated subset of owner tools (checkin, members, payments, lockers, etc.). |

The product is designed for the **Indian gym market** (rupee currency, city/pincode
address fields, a bundled Indian-city search list). The UI is phone-sized (Playwright
tests run at 390×844) even though it's a web app, with a bottom-nav shell per role.

It is **three deployable services**:

```
gymvyn-frontend  (React SPA, Vercel)
        │  HTTPS + Supabase JWT bearer token
        ▼
gymvyn-backend   (Node/Express monolith, Railway)
        │  service-role key            │  X-Internal-Key
        ▼                              ▼
Supabase (Postgres + Auth + Storage)   gymvyn-ml (Python FastAPI, XGBoost churn model)
        ▲
        │  (frontend ALSO talks to Supabase directly for auth + some reads)
gymvyn-frontend
```

There are sibling repos on the same machine (`gymvyn-admin`, `gymvyn-website`,
`gymvyn-ml`, and older `fitforge-*` copies). This document covers **gymvyn-frontend**
and **gymvyn-backend**; `gymvyn-ml` is summarized where it's relevant.

## Tech stack and why

### Frontend (`gymvyn-frontend`)
- **React 19 + Vite 8** — SPA, fast HMR. No SSR, no Next.js: this is a client-rendered
  app behind a static host with SPA-rewrite (`vercel.json` rewrites everything to
  `index.html`).
- **React Router 7** — all routing is client-side in `src/App.jsx` (one big `<Routes>`).
- **Tailwind CSS 4** (via `@tailwindcss/postcss`) — utility styling; dark mode is a
  first-class concern (there's a `ThemeContext` and a large dark-mode audit history).
- **@supabase/supabase-js** — auth (email/password) and some direct DB reads.
- **Recharts** — dashboards/reports charts.
- **@mediapipe/pose + camera_utils + drawing_utils** — on-device pose estimation for
  the AI "form coach" (runs in the browser, no server round-trip for pose).
- **lucide-react** (icons), **qrcode.react** (gym checkin QR), **papaparse** (CSV member
  import), **axios** (present but most calls use `fetch`).
- **Playwright** — E2E tests, role-based, plus dark-mode visual regression.

### Backend (`gymvyn-backend`)
- **Node + Express 5, CommonJS** (`"type": "commonjs"`). One large `server.js` plus
  modular route files. No TypeScript.
- **@supabase/supabase-js with the SERVICE ROLE key** — the backend is effectively a
  trusted proxy in front of Postgres. This bypasses Row-Level Security (see Design
  Decisions and GAPS).
- **AI SDKs**: `@anthropic-ai/sdk` (Claude), `@google/generative-ai` (Gemini),
  `openai`, `@deepgram/sdk` (speech-to-text), plus a DeepSeek client. Different features
  use different providers.
- **Cloudinary + multer** — image/video upload (progress photos, gym logos, food photos,
  exercise videos).
- **node-cron** — scheduled jobs (payment reminders, XP, lockers).
- **pdfkit / qrcode / sharp / csv-parse** — reports, checkin QR, image processing, CSV import.

### ML (`gymvyn-ml`, aka fitforge-ml)
- **Python FastAPI + XGBoost + SHAP** — member **churn prediction** for gym owners.
  Trained on (currently synthetic) data. The Node backend calls it through
  `ml_client.js` using an `X-Internal-Key` shared secret. If the ML service is down,
  the backend falls back to a legacy rule-based churn score.

### Data + Auth: Supabase
- Postgres is the single source of truth. Auth is Supabase Auth (JWT). Storage is used
  via Cloudinary rather than Supabase Storage in most places.

## Architecture / data flow

### Two ways the frontend gets data
1. **Direct to Supabase** (`src/utils/supabase.js`) — used for **auth** (`onAuthStateChange`,
   `signIn`, `signUp`) and a handful of direct table reads (e.g. `useAuth` reads the
   `users` and `trainer_profiles` tables directly to decide onboarding state).
2. **Through the backend** (`src/utils/api.js`) — everything else. This file is the
   single API client and is worth reading in full; it has **two request helpers**:
   - `apiFetch` / `xpFetch` / `dietRequest` — attach the Supabase bearer token.
   - **raw `fetch`** — many gym-owner/member functions send **no token at all**.

   That split is not accidental — it mirrors the backend's security split (below).

### Backend request handling
`server.js` (~5,100 lines) is a **monolith with ~93 inline route handlers** plus **18
mounted route modules** at the bottom (`app.use('/api/xp', ...)` etc.). There are two
generations of code living side by side:

- **Legacy inline routes** (gyms, gym-members, gym-payments, checkin, food-logs,
  workouts, macros, users) — mostly take `userId`/`gymId` straight from the URL or body
  and **do not authenticate**. The service-role key means these run with full DB access.
- **Newer modular routes** (`routes/*.js`, `src/routes/*.js`: chat, xp, gym, trainer,
  staff, supplements, gym-feed, reports, diet-plans, etc.) — these **do** enforce an
  `auth` middleware and, increasingly, ownership checks.

The auth middleware (`middleware/auth.js`) validates the Supabase JWT with
`supabase.auth.getUser(token)` and sets `req.user`. **Note:** there are actually *three*
slightly different auth implementations in the tree (see GAPS) — `middleware/auth.js`
(`req.user`), an inline copy in `src/routes/ai.js` (`req.userId`), and
`authenticateToken`/`requireGymOwner`/`requireStaffRole` inside `routes/staffRoutes.js`.

### Role & routing model (frontend)
`src/App.jsx` is the map of the whole app. Route groups:
- **Public**: `/login`, `/signup` (wrapped in `PublicRoute`).
- **Auth-but-not-onboarded**: `/role-select`, `/onboarding`, `/gym-onboarding`,
  `/become-trainer` (wrapped in `AuthRoute`).
- **Consumer** (shared `ConsumerLayout` + `BottomNav`): `/home`, `/workout`, `/diet`,
  `/progress`, `/community`, `/my-gym`, `/my-trainer`, `/chat`, `/xp`, etc.
- **Trainer** (shared `TrainerLayout`): `/trainer/*`.
- **Gym owner** (each route wrapped in `GymOwnerRoute`): `/gym/*`.
- **Staff** (shared `StaffLayout` under `StaffRoute`): `/staff/*`.
- Several **full-screen** routes (live workout session, plan builders, template/diet
  editors) sit outside the nav layouts.

Route guards live in `src/components/*Route.jsx` (`ProtectedRoute`, `AuthRoute`,
`GymOwnerRoute`, `StaffRoute`, `PublicRoute`). Auth state comes from
`src/hooks/useAuth.jsx` (`AuthProvider`).

### Auth/onboarding lifecycle (subtle — read `src/hooks/useAuth.jsx`)
- The provider subscribes **only** to `supabase.auth.onAuthStateChange` and never calls
  `getSession()` — Supabase v2 fires an `INITIAL_SESSION` event on mount, and a parallel
  `getSession()` call causes a browser auth-lock conflict. Don't "fix" this by adding one.
- `checkOnboarding` decides, per role, whether onboarding is complete (consumer needs
  `goal` + `training_days`; trainer needs a `trainer_profiles` row; gym_owner needs a
  `gym_id`; staff needs an active `gym_staff` row) and **caches the result in
  localStorage** (`gv_onboarding_<uid>`, `gv_role_<uid>`) so token-refresh events are
  instant.
- On any timeout/error it **assumes onboarding is complete** to avoid a redirect loop.
- The callback deliberately does **not** `await` — awaiting inside the subscriber holds
  Supabase's auth lock and blocks token refresh.

### Cross-cutting systems
- **XP / gamification**: `src/services/xpEngine.js` on the backend awards XP for workouts
  and diet logging; streaks, streak-freeze, weekly challenges, seasons, leaderboards, and
  a "muscle balance" view. Cron in `src/services/xpCron.js`. Frontend: `useStreak`,
  `XPToast`, `xpCalculator.js`, `/xp`, `/leaderboard`.
- **AI features** (`src/ai/`): voice diet logging (Deepgram transcribe → LLM parse), food
  vision (photo → nutrition, with perceptual image hashing + a vision cache to avoid
  re-billing), voice workout logging, and diet-plan generation. All are behind a
  **feature flag** (`aiFeatureFlag` middleware, driven by `AI_*_ENABLED` env vars) and an
  `aiRateLimit`. Separately, `server.js` has older inline Gemini-powered
  `/generate-workout-plan` and `/generate-diet-plan` endpoints.
- **Payments/checkins/lockers**: gym-owner operational tooling, largely legacy inline
  routes. A daily cron sends payment reminders.

## Key design decisions (inferred)

1. **Backend-as-trusted-proxy with the service-role key.** Instead of leaning on Supabase
   Row-Level Security, the backend holds the service key and does (or is *supposed* to do)
   authorization in application code. Stated reason in comments: it sidesteps PostgREST
   schema-cache errors (e.g. the `workout_logs.exercises` JSONB column) and RLS
   complexity. The cost: RLS is not a safety net, so **every missing auth check is a real
   data-exposure hole**. This is the single most important thing to understand about the
   backend.
2. **Two-generation backend.** The team is visibly migrating from unauthenticated inline
   routes toward authenticated modular routes (commit `b94591e "require auth + ownership
   checks on all trainer routes (IDOR)"`). New work should be a modular route with `auth`;
   don't add more inline unauthenticated handlers to `server.js`.
3. **localStorage-cached auth** for perceived speed and to survive token refreshes without
   flicker or lock contention. Deliberate and load-bearing — treat `useAuth.jsx` as
   delicate.
4. **On-device pose estimation** (MediaPipe in the browser) keeps the form-coach feature
   cheap and private — no video leaves the device for pose analysis.
5. **AI behind flags + cache + rate limit** because each call costs money; the vision cache
   and image hashing exist specifically to avoid paying twice for the same photo.
6. **Phone-first web app.** No native app; the whole thing is a responsive SPA styled to
   look like a native mobile app with per-role bottom navs.

## Critical paths (what's load-bearing)

- **`src/utils/api.js`** — every backend call. Changing a helper's URL, method, or the
  token/no-token choice affects a whole feature area. The `normalizeApiBase` guard exists
  because a misconfigured `VITE_API_URL` previously made every call hit the Vercel SPA and
  405.
- **`src/hooks/useAuth.jsx`** — auth + onboarding gating for all five roles. Fragile by
  design (see lifecycle notes). Bugs here lock users out or loop redirects.
- **`src/App.jsx`** — the route/guard map. New pages get wired here.
- **`server.js`** — the backend monolith. It's huge; use the knowledge graph or
  `grep -n "app\.\(get\|post\)"` to find a route rather than reading top to bottom.
- **`middleware/auth.js`** and the modular route files — the actual security boundary.
- **`src/services/xpEngine.js` / `xpCron.js`** — gamification correctness.

**Safe to change casually:** presentational components (`src/components/**`, most `pages`
that are pure UI), static data (`src/data/exercises_by_muscle/*.json`,
`exerciseDatabase.js`), styling. **Change with care:** anything in `api.js`, `useAuth.jsx`,
route guards, and any backend route's auth/ownership logic.

## Surprising / non-obvious things that will trip you up

- **The FitForge → Gymvyn rename is unfinished.** You'll see `ff_`→`gv_` localStorage
  migration in `useAuth.jsx`, `FRONTEND_URL` defaulting to `fitforge-frontend.vercel.app`,
  the Cloudinary folder `fitforge/progress`, and the ML service calling itself
  "FitForge ML Service". Names are inconsistent; don't assume a `fitforge` reference is dead.
- **Two trainer route files are both live.** `./trainerRoutes.js` (root, mounted the old
  function-style way: `require('./trainerRoutes')(app, supabase)`) *and*
  `routes/trainerRoutes.js` (mounted at `/api/trainer`). Both add routes. Check both when
  touching trainer endpoints.
- **`app.use(cors())` allows all origins.** The `allowedOrigins` array at the top of
  `server.js` is defined but never used — dead config.
- **Not all backend routes authenticate.** Never assume an endpoint checks who's calling.
  92 of 93 inline `server.js` routes do not. Verify before trusting.
- **The frontend talks to Supabase directly AND through the backend.** Auth and a few
  reads bypass the backend entirely.
- **`apiFetch` swallows the server's error message** — it throws `API error ${status}`,
  so the real backend message is lost. The raw-`fetch` helpers do surface `data.message`.
- **`npm test` in the backend just errors** — there are no backend unit tests; "tests" are
  manual scripts in `scripts/` and the Playwright E2E suite in the frontend.
- **Leftover debug code ships.** A top-level middleware logs every request (`>>> HTTP:`)
  with a comment "remove once 500 is diagnosed", and `App.jsx` has a `/preview-exercise`
  "DEV PREVIEW — remove before shipping" route.
- **Lots of `.md` audit files in the frontend root** (`DARK_MODE_AUDIT.md`, etc.) are
  historical notes, not current specs.
