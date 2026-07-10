# Gymvyn Frontend Agent Instructions

## Project
This is the Gymvyn frontend repo.

Path:
~/Desktop/gymvyn-frontend

Sibling backend repo:
~/Desktop/gymvyn-backend

Do not move folders. Do not create a parent workspace. Claude, GitHub, and the existing workflow depend on the current sibling repo layout.

## User context
The user is Artaz, solo founder of Gymvyn. The user is not deeply technical. Final explanations to the user should be short, plain-language, direct, and candid. Separate verified facts from assumptions.

## Non-negotiable rules
- Stay on main branch. No worktrees.
- Do not make unrelated changes.
- Diagnose before editing.
- One task at a time.
- Do not treat "prompt sent" as "done."
- Always provide verification commands before finishing.
- Mark anything unverified clearly.

## Frontend stack
- React + Vite + Tailwind v4.
- Vercel deploys automatically from GitHub push.
- Never manually run Vercel production deploys.
- Never touch Vercel project settings unless explicitly asked.

## UI rules
- Use CSS variables only.
- Do not hardcode colors.
- Dark mode uses data-theme="dark" on the HTML element.
- Use useLayoutEffect for theme sync where relevant.
- No emojis anywhere in the UI. Use inline SVGs instead.
- localStorage keys must use gv_ prefix.

## Backend awareness
Backend repo is at:
~/Desktop/gymvyn-backend

If a frontend task depends on API behavior, inspect the backend sibling repo before guessing.

Do not edit backend files unless the user explicitly asks or the task clearly requires a coordinated frontend/backend fix.

## Important backend/database facts
- users table has no email column. Email lives in auth.users only.
- Starting weight is not a users column. It is stored in progress_entries.
- progress_entries.logged_at must be a full ISO timestamp.
- AI API keys must never be exposed in frontend or VITE_* vars.
- Cloudinary paths must stay as fitforge/exercises/.

## Security testing standard
For any auth, ownership, gym/member, trainer/client, chat, or relationship-status change, test:

1. Unauthorized user is blocked.
2. Resource owner/self is allowed.
3. Legitimately linked different party is allowed.
4. Inactive/stale relationship is blocked.

## Required final report
Before finishing any future task, provide:

1. Files changed
2. Exact root cause found
3. Exact fix made
4. Commands run
5. Whether frontend changed
6. Whether backend changed
7. Whether deployment is needed
8. Manual browser verification steps
9. Anything still unverified

## Existing repo guide

The following instructions were already present and remain useful. Keep them unless they directly conflict with the non-negotiable rules above.

# AGENTS.md — gymvyn-frontend

Operational guide for working in this repo. For architecture/"why", read
[PROJECT.md](PROJECT.md). For known bugs and security holes, read [GAPS.md](GAPS.md).

- **PROJECT.md** — what Gymvyn is, the 3-service architecture, role model, critical paths.
- **GAPS.md** — ordered audit of weaknesses; **read items 1–2 before touching any backend route.**

This is the **frontend** repo. The **backend** is `../gymvyn-backend` (Node/Express) and the
**churn ML service** is `../gymvyn-ml` (Python/FastAPI). Frontend + backend change together
constantly — expect to edit both.

---

## Commands

### Frontend (`gymvyn-frontend`)
- Install: `npm install`
- Dev: `npm run dev` (Vite, port 5173; Playwright expects `PORT=5174 npm run dev`)
- Build: `npm run build` · Preview built: `npm run preview`
- Lint: `npm run lint` (ESLint flat config, `eslint.config.js`)
- E2E: `npx playwright test` (needs the backend + a seeded test ecosystem running — see below)
- Dark-mode tests: `npm run test:dark` (runtime + visual); update snapshots with
  `npm run test:dark-update`
- Deploy: Vercel (SPA; `vercel.json` rewrites all paths to `/index.html`)

### Backend (`../gymvyn-backend`)
- Install: `npm install`
- Dev: `npm run dev` (`node --watch server.js`) · Prod: `npm start` (`node server.js`)
- **No unit tests** (`npm test` intentionally errors). Manual sweeps live in `scripts/`
  (e.g. `node scripts/test-api-sweep.js`). Seed data: `node scripts/seed-test-ecosystem.js`.
- Migrations: raw SQL in `migrations/`, applied via `node migrate.js` or Supabase MCP/dashboard.
- Deploy: Railway.

### ML (`../gymvyn-ml`)
- `uvicorn app.main:app --reload --port 8000`; `pytest`. Backend reaches it via `ML_SERVICE_URL`.

---

## Conventions this codebase actually follows

- **Frontend is JS + JSX, no TypeScript.** React 19, React Router 7, Tailwind 4, function
  components + hooks. Files: `PascalCase.jsx` for components/pages, `camelCase.js` for
  hooks/utils. Hooks are `useX.js(x)` in `src/hooks/`.
- **Directory layout:** `src/pages/*` (routed screens, grouped by role in `gym/`, `staff/`,
  `trainer/`, `consumer/`, `owner/`), `src/components/*` (reusable + feature subfolders),
  `src/hooks/*`, `src/contexts/*` (Theme, Cart, WorkoutSession), `src/utils/*`, `src/data/*`
  (static exercise JSON).
- **All backend calls go through `src/utils/api.js`.** Add new endpoints there, don't scatter
  `fetch` in components. Two helper styles exist: token-attaching (`apiFetch`, `xpFetch`,
  `dietRequest`) and bare `fetch` (no token). **New authenticated features must use
  `apiFetch`/`xpFetch`.**
- **Auth/session:** only via `useAuth()` (`src/hooks/useAuth.jsx`) and `src/utils/supabase.js`.
  State: React context (`AuthProvider`, `ThemeProvider`, `WorkoutSessionProvider`,
  `XPToastProvider`, `CartContext`) — no Redux/Zustand.
- **Backend:** Express 5, CommonJS (`require`). New endpoints belong in a **modular route file**
  under `routes/` (or `src/routes/`) mounted in `server.js`, **with the `auth` middleware** —
  not as another inline handler in `server.js`.
- **Backend DB access** uses the Supabase **service-role** client. Because that bypasses RLS,
  **you must add the auth + ownership check yourself in the handler** (see GAPS items 1–2).
- **Errors:** frontend helpers throw `Error`; components catch and toast. Backend returns
  `{ error }` or `{ message }` with an HTTP status.
- **Currency/locale:** rupees (₹), Indian address fields (city/state/pincode). Mobile-first UI.

---

## Gotchas (things that look like they should work one way but don't)

- **`useAuth.jsx` is deliberately fragile — do not "clean it up".** It subscribes only to
  `onAuthStateChange` (never `getSession()`), never `await`s inside the callback, and caches
  role/onboarding in localStorage (`gv_onboarding_<uid>`, `gv_role_<uid>`). Each of those is a
  fix for a real bug (auth-lock conflict, blocked token refresh, redirect loop). Read the
  comments before editing.
- **Not every backend route is authenticated.** ~92 of 93 inline `server.js` routes take an id
  from the URL/body and run with the service key. Never assume an endpoint verifies the caller —
  check, and add auth if you're editing it.
- **Two trainer route files are both live:** `../gymvyn-backend/trainerRoutes.js` (root,
  function-mounted) **and** `../gymvyn-backend/routes/trainerRoutes.js` (`/api/trainer`). Edit
  the right one — often both.
- **Three different auth middlewares** set different props (`req.user` vs `req.userId`). If you
  copy a handler, confirm which the surrounding file uses (see GAPS item 4).
- **`apiFetch` hides the server error message** (throws `API error <status>`); the other helpers
  surface `data.message`. Don't rely on `apiFetch` errors being descriptive.
- **`VITE_API_URL` must be a full origin.** `normalizeApiBase` in `api.js` prepends `https://`
  and strips trailing slashes because a bad value made every call hit the Vercel SPA and 405.
- **FitForge and Gymvyn are the same product.** A `fitforge` reference is probably live, not dead
  (rename is unfinished — PROJECT.md).
- **`app.use(cors())` allows all origins** — the `allowedOrigins` array is unused.

---

## Rules

- **Never add a new unauthenticated route to `server.js`.** New endpoints go in a modular route
  file with `auth` + an ownership/role check.
- **Never commit secrets or `.env` files.** The backend `.env` (service key + AI keys) must stay
  untracked. The frontend `.env` is currently tracked by mistake (GAPS item 5) — don't add to it.
- **Never expose or log the Supabase service-role key**, and don't move it to the frontend.
- **Don't break `src/utils/api.js` signatures casually** — every feature depends on them.
- **Generated / not hand-edited:** `dist/`, `node_modules/`, `package-lock.json`,
  `tests/dark-mode-visual.spec.js-snapshots/` (regenerate via `npm run test:dark-update`),
  `.code-review-graph/`, `.understand-anything/`, `graphify-out/`.
- **Static data** (`src/data/exercises_by_muscle/*.json`, `exerciseDatabase.js`) is
  bulk-generated/seeded — prefer regenerating over hand-editing.
- **When you change a backend route, check the matching `api.js` helper** (token vs no-token,
  path, method) and vice versa.

---

## MCP Tools: code-review-graph

**This project has a knowledge graph. Prefer the code-review-graph MCP tools over Grep/Glob/Read
for exploration** — faster, cheaper, and gives structural context (callers, dependents, tests).
`server.js` is ~5,100 lines; use the graph or `grep -n "app\.\(get\|post\)"` to find routes
instead of reading it top to bottom.

- **Explore code:** `semantic_search_nodes` / `query_graph` (patterns: `callers_of`,
  `callees_of`, `imports_of`, `tests_for`) instead of Grep.
- **Impact of a change:** `get_impact_radius` / `get_affected_flows`.
- **Code review:** `detect_changes` + `get_review_context`.
- **Architecture:** `get_architecture_overview` + `list_communities`.

The graph auto-updates on file changes via hooks. Fall back to Grep/Glob/Read only when the graph
doesn't cover what you need. The backend has its own graph — run graph tools with
`repo_root=/Users/artazayaz/Desktop/gymvyn-backend` when working there.

---

## Recommended skills for this repo

Scoped to what actually fits a JS/JSX React + Express + Supabase fitness app. Prefer these over
scanning the full skill list.

- **Planning/workflow:** `brainstorming`, `writing-plans`, `executing-plans`,
  `finishing-a-development-branch`, `using-git-worktrees`, `dispatching-parallel-agents`,
  `subagent-driven-development`
- **Code quality:** `code-review`, `security-review`, `review-changes`, `simplify`, `ponytail*`,
  `systematic-debugging`, `refactor-safely`, `verify`, `verification-before-completion`,
  `test-driven-development`, `receiving-code-review`, `requesting-code-review`
- **Codebase exploration:** `graphify` (this repo's knowledge graph — prefer over Grep/Read)
- **Frontend/UI:** `frontend-design` or `impeccable` (pick one, they overlap), `ux-designer`,
  `make-interfaces-feel-better`, `transitions-dev`, `gsap-*` (only if animating with GSAP),
  `app-onboarding-questionnaire` (onboarding flows), `dataviz`, `artifact-design`,
  `web-artifacts-builder`
- **Testing:** `webapp-testing` (Playwright)
- **Security work (GAPS.md remediation):** `exploitability-validation`, `redteam-hunting` — only
  when actively auditing/fixing auth or IDOR issues
- **Meta:** `Codex-api`, `output-skill`, `writing-skills`, `using-superpowers`

Everything else installed (office-doc generation, 3D/shader/art/image-gen, social-media research,
C/C++ crash analysis, duplicate "taste"/design skills, and anything already bundled in the
`Codex-mem` plugin) is off-domain for this repo — don't reach for it here.
