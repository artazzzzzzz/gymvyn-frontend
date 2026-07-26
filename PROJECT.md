# Gymvyn — Project Overview

> Onboarding doc for an engineer or AI agent new to this codebase. Read this for
> the "why" and the shape of the system. See [GAPS.md](GAPS.md) for known
> weaknesses and [CLAUDE.md](CLAUDE.md) for day-to-day operational rules.
>
> Last full sweep: **2026-07-22** (covers `gymvyn-frontend`, `gymvyn-backend`,
> `gymvyn-admin`, `gymvyn-plans`; `gymvyn-ml` and `gymvyn-website` summarized).

## What this is

**Gymvyn** (formerly **FitForge** — rename still unfinished, see below) is a
mobile-first fitness platform. The core product is one React app that serves
**five kinds of user** from the same codebase, and there is now a small
constellation of companion services around it (a superadmin console, a public
trainer-plan marketplace, and an ML churn service).

| Role | What they do |
| ---- | ------------ |
| **consumer** | Solo user: logs workouts, tracks diet (with barcode + AI photo/voice logging), sees progress, earns XP, joins the community feed, uses the AI form coach, adds friends. |
| **gym_member** | A consumer linked to a gym (via join code). Same features plus gym feed, classes, supplements, and a trainer relationship. |
| **trainer** | Manages clients, builds workout/diet templates, assigns plans, chats with clients, tracks earnings, and (new) publishes paid plan listings to the Gymvyn Plans marketplace. |
| **gym_owner** | Runs a gym: members, payments, staff, schedule/classes, checkins (QR), supplements, expenses, lockers, reports, churn insights (ML). |
| **staff** | Gym employee with a permission-gated subset of owner tools (checkin, members, payments, lockers, etc.). |

The product targets the **Indian gym market** (rupee currency, city/state/pincode
address fields, a bundled Indian-city search list). The UI is phone-sized even on
the web (Playwright tests run at 390×844), with a per-role bottom-nav shell. As of
mid-2026 the same frontend also ships as a **native iOS/Android app via Capacitor**.

## The services (six repos)

All repos live side by side under `~/Desktop/`. This doc focuses on the four named
in the knowledge-transfer scope; `gymvyn-ml` and `gymvyn-website` are noted where
relevant.

```
                                  ┌─────────────────────────────┐
   gymvyn-frontend  ──────────────┤ gymvyn-backend              │
   React 19 SPA + Capacitor       │ Node/Express 5 monolith     │
   (Vercel web + iOS/Android)     │ (Railway)                   │
        │  Supabase JWT bearer    │  service-role key           │
        │                         │  ├──> Supabase (Postgres/Auth/Storage)
        │  (direct to Supabase    │  ├──> Cloudinary (media)
        │   for auth + a few reads)│  ├──> Razorpay (Plans payments, test mode)
        ▼                         │  └──> gymvyn-ml  (X-Internal-Key, churn)
   Supabase Auth  <───────────────┘             FastAPI + XGBoost (Python)
        ▲    ▲
        │    │  anon-key direct reads (users/logs/exercises)  ┌────────────────┐
        │    └──────────────────────────────────────────────┤ gymvyn-admin    │
        │                                                     │ React/Vite      │
        │  Supabase JWT bearer ──> backend /api/plans/*       │ superadmin      │
        │                                                     └────────────────┘
   ┌────────────────────────────┐   backend /api/plans/*
   │ gymvyn-plans               ├──────────────────────>  gymvyn-backend
   │ Next.js 16 on Cloudflare   │   (public listings, trainer seller portal,
   │ Workers; also a ChatGPT app│    purchases via Razorpay)
   └────────────────────────────┘
```

- **gymvyn-frontend** — the main app. React 19 + Vite + React Router 7 + Tailwind 4.
  Deployed as an SPA on **Vercel** and packaged as a **Capacitor** native app
  (`appId: com.gymvyn.app`) for iOS/Android. **This repo.**
- **gymvyn-backend** — the Express 5 monolith (`server.js` ~5,365 lines + ~24 modular
  route files). Holds the Supabase **service-role** key; talks to Cloudinary,
  Razorpay, the AI providers, and the ML service. Deployed on **Railway**. Git
  remote is still `fitforge-backend.git`.
- **gymvyn-admin** — an internal **superadmin console** (React 19 + Vite + Recharts,
  linted with **oxlint**). Two data paths: it reads users/exercises/AI-usage
  **directly from Supabase with the anon key**, and it approves Plans purchases
  **through the backend** (`/api/plans/admin/*`). Single hardcoded admin identity.
- **gymvyn-plans** — a **public marketplace website** where trainers sell workout/diet
  plans and consumers buy them. **Next.js 16** rendered on **Cloudflare Workers**
  (via `vinext`/`wrangler`, `@cloudflare/vite-plugin`), TypeScript, Drizzle ORM
  configured but the local schema is empty (it's a thin proxy to the backend). Also
  wired to run as a **ChatGPT app** (reads `oai-authenticated-user-*` headers).
  Payments use **Razorpay** (test mode).
- **gymvyn-ml** — Python **FastAPI + XGBoost + SHAP** churn-prediction service. The
  backend calls it via `ml_client.js` with an `X-Internal-Key` shared secret and
  falls back to a legacy rule-based score if it's down. Has `pytest` tests.
- **gymvyn-website** — marketing site (out of scope here).

## Tech stack and why

### Frontend (`gymvyn-frontend`)
- **React 19 + Vite** — client-rendered SPA, fast HMR. No SSR/Next: static host with
  SPA rewrite (`vercel.json` rewrites everything to `index.html`).
- **React Router 7** — all routing client-side in `src/App.jsx` (one big `<Routes>`).
- **Tailwind CSS 4** (via `@tailwindcss/postcss`) — utility styling; dark mode is a
  first-class concern (`ThemeContext`, large dark-mode audit history).
- **@supabase/supabase-js** — auth (email/password + OAuth) and a few direct DB reads.
- **Capacitor 8** (`@capacitor/core|app|browser|camera|ios|android`) — wraps the SPA
  as a native app. Native OAuth returns via the deep link `gymvyn://auth/callback`,
  handled by `src/components/NativeAuthBridge.jsx` (the native analogue of the web
  `AuthCallback`). `@capacitor/camera` backs native food-photo capture.
- **@mediapipe/pose + camera_utils + drawing_utils** — on-device pose estimation for
  the AI "form coach" (runs in the browser, no server round-trip for pose).
- **Recharts** (charts), **lucide-react** (icons), **qrcode.react** (checkin QR),
  **papaparse** (CSV member import).
- **Playwright** — role-based E2E + dark-mode visual regression. **`node --test`** —
  a small unit suite (auth flow, loading state, friends state, CSV, checkin search).
- Note: `axios` was removed (all HTTP now goes through `fetch` in `api.js`). `graphify`
  is present as a dependency (an analysis tool that leaked into runtime deps).

### Backend (`gymvyn-backend`)
- **Node + Express 5, CommonJS.** One large `server.js` plus ~24 modular route files
  under `routes/` and a few under `src/routes/`. No TypeScript.
- **@supabase/supabase-js with the SERVICE-ROLE key** — the backend is a trusted proxy
  in front of Postgres; it bypasses Row-Level Security and does authorization in
  application code (see Design Decisions).
- **express-rate-limit** — a `globalLimiter` plus a stricter `authLimiter` on
  auth-sensitive routes.
- **AI SDKs**: `@anthropic-ai/sdk` (Claude), `@google/generative-ai` (Gemini),
  `openai`, `@deepgram/sdk` (speech-to-text), plus a DeepSeek client. Different
  features use different providers.
- **razorpay** — server-created payment orders for the Plans marketplace.
- **Cloudinary + multer** — image/video upload (progress photos, gym logos, food
  photos, exercise videos).
- **node-cron** — scheduled jobs (payment reminders, XP, lockers).
- **pdfkit / qrcode / sharp / csv-parse** — reports, checkin QR, image processing,
  CSV import.
- **`node --test`** — a real unit/integration suite now exists (auth, trainer-route
  auth, diet-plan auth, plans routes, chat security, friends, food resolver, etc.).

### Admin (`gymvyn-admin`)
- **React 19 + Vite + React Router 7 + Recharts**, **oxlint** (not eslint). No tests.
- Talks to Supabase directly (anon key) for read-only dashboards and to the backend
  for Plans purchase approval.

### Plans (`gymvyn-plans`)
- **Next.js 16 (App Router) on Cloudflare Workers** through `vinext` + `wrangler` +
  `@cloudflare/vite-plugin` + `@vitejs/plugin-rsc`. **TypeScript + Tailwind 4.**
- **Drizzle ORM** is configured (`drizzle.config.ts`, `db/schema.ts`) but the schema
  is intentionally empty — the site owns no database and reads everything from the
  backend's `/api/plans/*` endpoints (`lib/api.ts`, `lib/trainer-api.ts`,
  `lib/purchase-api.ts`).
- Dual identity: a Supabase session (trainer seller portal at `/trainer`, buyer
  checkout) **and** a ChatGPT-app identity (`app/chatgpt-auth.ts`, `.openai/`).

### Data + Auth: Supabase
- Postgres is the single source of truth. Auth is Supabase Auth (JWT). Media lives in
  Cloudinary rather than Supabase Storage in most places.

## Architecture / data flow

### How the main frontend gets data
1. **Direct to Supabase** (`src/utils/supabase.js`) — used for **auth**
   (`onAuthStateChange`, `signIn`, `signUp`, OAuth code exchange) and a handful of
   direct table reads (e.g. `useAuth` reads `users`/`trainer_profiles` to decide
   onboarding state).
2. **Through the backend** (`src/utils/api.js`) — everything else. This is the single
   API client and is worth reading in full. It has **two helper styles**:
   - `apiFetch` / `xpFetch` / `dietRequest` — attach the Supabase bearer token.
   - **raw `fetch`** — a shrinking set of older gym-owner/member functions.
   `normalizeApiBase` prepends `https://` and strips trailing slashes on
   `VITE_API_URL` because a bad value once made every call hit the Vercel SPA and 405.

### Backend request handling — a **hardened** monolith
`server.js` is a monolith with ~82 inline route handlers plus ~24 mounted route
modules (`app.use('/api/xp', ...)` etc.). There are still two generations of code,
but the security story has **flipped since the last audit**:

- **Inline routes are now authenticated.** 81 of 82 inline routes run the `auth`
  middleware; the only unauthenticated one is `GET /health`. The routes the previous
  audit flagged as open (`GET/PATCH /api/users/:userId`, `/api/gym-members`,
  `/api/gym-payments/:gymId`, `/api/checkin`, `/api/users/:userId/change-password`)
  now enforce **authN + a real ownership/role check** (e.g. `req.user.id === userId`,
  `isGymOwner || active staff row`) and, for updates, a **field allowlist**.
- **Modular routes** (`routes/*.js`, `src/routes/*.js`) are the newer, cleaner tier —
  `chat`, `xp`, `gym`, `trainer`, `staff`, `supplements`, `gym-feed`, `reports`,
  `diet-plans`, `plans`, `friends`, `custom-foods`, `saved-meals`, `class-bookings`,
  `trainer-earnings`, `staff-earnings`, `equipment`, `measurements`, `member-imports`,
  `assistant`, etc. — all use `auth` and ownership/role guards by default.
- **Auth middleware is now unified.** `middleware/auth.js` exports `auth`
  (sets both `req.user` and a `req.userId` alias), `requireGymOwner`,
  `requireStaffRole`, and `requireTrainerRole`. `src/routes/ai.js` and
  `routes/staffRoutes.js` now **import** this module rather than defining their own
  copies. `plansRoutes.js` adds a `requireAdminPlans` (email allowlist) on top.
- **CORS is now scoped** — `app.use(cors({ origin: <callback checking allowedOrigins
  + a localhost pattern> }))`. The old wide-open `cors()` is gone.

### Role & routing model (frontend)
`src/App.jsx` is the map of the whole app. Route groups:
- **Public**: `/login`, `/signup` (in `PublicRoute`).
- **Auth-but-not-onboarded**: `/role-select`, `/onboarding`, `/gym-onboarding`,
  `/become-trainer` (in `AuthRoute`).
- **Consumer** (shared `ConsumerLayout` + bottom nav): `/home`, `/workout`, `/diet`,
  `/progress`, `/community`, `/my-gym`, `/my-trainer`, `/chat`, `/xp`, `/client/friends`,
  etc.
- **Trainer** (shared layout, guarded by `TrainerRoute`): `/trainer/*`, including
  `/trainer/plans` (marketplace listing management inside the main app).
- **Gym owner** (each route in `GymOwnerRoute`): `/gym/*`.
- **Staff** (shared layout under `StaffRoute`): `/staff/*`.
- Several **full-screen** routes (live workout session, plan builders, template/diet
  editors) sit outside the nav layouts.
- `<NativeAuthBridge />` is mounted once near the root to catch native OAuth deep links.

Route guards live in `src/components/*Route.jsx` (`ProtectedRoute`, `AuthRoute`,
`GymOwnerRoute`, `StaffRoute`, `TrainerRoute`, `PublicRoute`). Auth state comes from
`src/hooks/useAuth.jsx` (`AuthProvider`); redirect resolution lives in
`src/utils/authFlow.js` / `authFlowCore.js`.

### Auth/onboarding lifecycle (subtle — read `src/hooks/useAuth.jsx`)
- The provider subscribes **only** to `supabase.auth.onAuthStateChange` and never
  calls `getSession()` — Supabase v2 fires `INITIAL_SESSION` on mount, and a parallel
  `getSession()` causes a browser auth-lock conflict. Don't "fix" this by adding one.
- Onboarding completion is decided per role (consumer needs `goal` + `training_days`;
  trainer needs a `trainer_profiles` row; gym_owner needs a `gym_id`; staff needs an
  active `gym_staff` row) and **cached in localStorage** (`gv_onboarding_<uid>`,
  `gv_role_<uid>`) so token-refresh events are instant.
- On any timeout/error it **assumes onboarding is complete** to avoid a redirect loop.
- The `onAuthStateChange` callback deliberately does **not** `await` — awaiting inside
  it holds Supabase's auth lock and blocks token refresh.
- Native OAuth: the provider returns to `gymvyn://auth/callback`; `NativeAuthBridge`
  parses the deep link, calls `exchangeCodeForSession`, and resolves the redirect —
  mirroring the web `AuthCallback` without a page load.

### The Gymvyn Plans marketplace (newest subsystem)
A trainer publishes a workout/diet **template** as a paid **listing**; a buyer
purchases it; on payment the plan is **delivered** into the buyer's normal plan
library. Implemented almost entirely in `gymvyn-backend/routes/plansRoutes.js`
(well-written, security-conscious — a good model for new code):

- **Public browse**: `GET /api/plans/listings`, `/listings/:slug`,
  `/trainers/:handle` — only public-safe fields (no email/phone).
- **Trainer seller portal**: `/api/plans/trainer/*` — `auth` + `requireTrainerRole` +
  an `is_active`/`status='active'` `trainer_profiles` check + per-listing ownership +
  `ownTemplate` checks. Listing prices have floors (INR ≥ 2000 paise, USD ≥ 100 cents);
  a fixed 5% commission (`COMMISSION_BPS = 500`); publishing snapshots the template
  into `plans_listing_versions`.
- **Buyer purchase**: `POST /api/plans/purchases` — idempotent (returns the existing
  non-terminal purchase instead of duplicating), blocks buying your own listing,
  re-derives price server-side. If `PLANS_PAYMENTS_ENABLED=true`, it creates a
  **Razorpay** order server-side and returns the order for the browser to open.
- **Delivery**: `deliverPurchase()` writes into the same `assigned_plans` /
  `assigned_diet_plans` tables a trainer's own assign flow uses, so the buyer's "my
  plan" screens render it identically. Idempotent + concurrency-guarded (status-gated
  update, `plans_payment_events` audit trail).
- **Admin approval**: `/api/plans/admin/purchases` (list) + `/approve` (deliver),
  gated by `requireAdminPlans` (the `PLANS_ADMIN_EMAILS` allowlist). This is currently
  the **only** way a purchase gets delivered — there is **no Razorpay webhook yet**, so
  payment verification and delivery are a **manual admin action** (see GAPS).

The `gymvyn-plans` website and the in-app `/trainer/plans` page are two frontends over
these same endpoints. `gymvyn-admin`'s `PlansPurchases` page is the approval UI.

### Cross-cutting systems
- **XP / gamification**: backend `src/services/xpEngine.js` awards XP for workouts and
  diet logging; streaks, streak-freeze, weekly challenges, seasons, leaderboards, a
  "muscle balance" view. Cron in `src/services/xpCron.js`. Frontend: `useStreak`,
  `XPToast`, `xpCalculator.js`, `/xp`, `/leaderboard`.
- **AI features** (`src/ai/`): voice diet logging (Deepgram → LLM parse), food vision
  (photo → nutrition, with perceptual image hashing + a vision cache to avoid
  re-billing), voice workout logging, diet-plan generation. Behind a **feature flag**
  (`aiFeatureFlag`, driven by `AI_*_ENABLED` env vars) + an `aiRateLimit`. Older inline
  Gemini `/generate-workout-plan` / `/generate-diet-plan` endpoints also exist.
- **Diet subsystem** (expanded): custom foods, saved meals, barcode lookup
  (`packaged_foods`), a bundled `src/data/foodDatabase.json`, macro auto-derivation,
  and trainer/client diet plans with per-day food assignments.
- **Friends**: `routes/friendRoutes.js` + `friendships_and_user_blocks` migration;
  frontend `FriendsPage`, friend requests, blocking.
- **Payments/checkins/lockers**: gym-owner operational tooling (now authenticated).
  A daily cron sends payment reminders.

## Key design decisions (inferred)

1. **Backend-as-trusted-proxy with the service-role key.** Rather than lean on Supabase
   RLS, the backend holds the service key and does authorization in application code.
   Stated reason: it sidesteps PostgREST schema-cache errors (e.g. the
   `workout_logs.exercises` JSONB column) and RLS complexity. The cost: **RLS is not a
   safety net for backend queries**, so every missing app-code check is a real hole.
   This is still the single most important thing to understand about the backend — but
   note the app-code checks are now largely **present** (unlike at the last audit).
2. **`gymvyn-admin` reads Supabase directly with the anon key.** For read-only
   dashboards (users, exercises, AI usage) the console skips the backend entirely and
   queries Supabase with the public anon key plus the admin's session. This means those
   tables' exposure is governed **entirely by RLS** — the client-side
   `email === 'adminceo@gmail.com'` gate is cosmetic. See GAPS: if RLS is off on those
   tables, the public anon key can read that data from anywhere.
3. **Two-generation backend, mid-migration but far along.** New work is a modular route
   with `auth` + ownership; the inline monolith has been retrofitted with auth rather
   than rewritten. `plansRoutes.js` is the reference for "how new code should look."
4. **localStorage-cached auth** for perceived speed and to survive token refreshes
   without flicker or lock contention. Deliberate and load-bearing — `useAuth.jsx` is
   delicate.
5. **On-device pose estimation** (MediaPipe in the browser) keeps the form coach cheap
   and private — no video leaves the device for pose analysis.
6. **AI behind flags + cache + rate limit** because each call costs money; the vision
   cache and image hashing exist specifically to avoid paying twice for the same photo.
7. **Capacitor over a rewrite.** Native iOS/Android reuse the exact web build (`webDir:
   dist`); only auth (deep-link OAuth) and camera needed native-specific code.
8. **Plans marketplace is deliberately staged.** Purchase creation, order creation, and
   delivery are separated; payments ship behind `PLANS_PAYMENTS_ENABLED` and delivery
   is manual-admin-only until a webhook lands. The code repeatedly notes what a "later
   phase" will add.
9. **Gymvyn Plans as a thin, DB-less proxy** (Drizzle schema empty) — the marketplace
   website trusts the backend as the source of truth and decides nothing security-
   relevant in the browser/worker.

## Critical paths (what's load-bearing)

- **`gymvyn-frontend/src/utils/api.js`** — every backend call. Changing a helper's URL,
  method, or token choice affects a whole feature area.
- **`gymvyn-frontend/src/hooks/useAuth.jsx`** (+ `utils/authFlow*.js`) — auth +
  onboarding gating for all five roles, web and native. Fragile by design.
- **`gymvyn-frontend/src/App.jsx`** — the route/guard map. New pages get wired here.
- **`gymvyn-backend/server.js`** — the monolith. Huge; use the knowledge graph or
  `grep -nE "app\.(get|post|put|patch|delete)\('/"` to find a route.
- **`gymvyn-backend/middleware/auth.js`** — the one true auth boundary; everything now
  imports it.
- **`gymvyn-backend/routes/plansRoutes.js`** — marketplace correctness + money. The
  reference implementation for new authenticated routes.
- **`gymvyn-backend/src/services/xpEngine.js` / `xpCron.js`** — gamification correctness.
- **`gymvyn-admin/src/lib/supabase.js`** + its pages — the anon-key read path; its blast
  radius is whatever RLS allows.

**Safe to change casually:** presentational components, pure-UI pages, static data
(`src/data/exercises_by_muscle/*.json`, `exerciseDatabase.js`, `foodDatabase.json`),
styling. **Change with care:** anything in `api.js`, `useAuth.jsx`/`authFlow*`, route
guards, any backend route's auth/ownership logic, `plansRoutes.js` money paths, and the
admin app's Supabase queries.

## Surprising / non-obvious things that will trip you up

- **The FitForge → Gymvyn rename is still unfinished.** The backend git remote is
  `fitforge-backend.git`; you'll see `ff_`→`gv_` localStorage migration in
  `useAuth.jsx`, `FRONTEND_URL` defaulting to a `fitforge-*.vercel.app` host, the
  Cloudinary folder `fitforge/progress`, and the ML service self-naming "FitForge ML."
  Don't assume a `fitforge` reference is dead.
- **The previous audit's "critical" items are mostly fixed.** Inline routes now
  authenticate, CORS is scoped, the `>>> HTTP` debug logger and `/preview-exercise` DEV
  route are gone, the frontend `.env` is no longer tracked, the duplicate root
  `trainerRoutes.js` was deleted, and both backend and frontend have `node --test`
  suites. Read GAPS.md for what's *actually* still open — don't trust older notes.
- **`gymvyn-admin` trusts RLS, not the backend, for most reads.** Only Plans purchase
  approval goes through the backend. Its login gate is a single hardcoded Gmail
  (`adminceo@gmail.com`) that differs from the backend's `PLANS_ADMIN_EMAILS` allowlist.
- **`gymvyn-plans` is a ChatGPT app too.** `app/chatgpt-auth.ts` reads
  `oai-authenticated-user-email` headers; the site can run inside ChatGPT, not just as a
  standalone Cloudflare-hosted website.
- **Plans payments don't self-verify.** With `PLANS_PAYMENTS_ENABLED=true` a Razorpay
  order is created, but there is **no webhook**; a human approves each purchase in the
  admin console to trigger delivery. `RAZORPAY_KEY_SECRET` must never reach the
  `gymvyn-plans` environment (README is explicit).
- **The main app is native now.** Capacitor wraps the same `dist` build; native OAuth
  and camera behave differently from web. Check `Capacitor.isNativePlatform()`.
- **`.md` audit files live in `docs/`** (`DARK_MODE_AUDIT.md`, `ICON_*.md`, etc.) —
  a known-but-unresolved backlog, not current specs; see GAPS.md for status.
- **Repos disagree on tooling.** Frontend/backend/admin are JS; plans is TS. Admin uses
  oxlint; the others use eslint. Plans is Next-on-Cloudflare; everything else is Vite or
  plain Node.
