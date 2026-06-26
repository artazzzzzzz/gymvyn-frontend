# Member-Side Onboarding (9-Screen Flow) Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans (inline) to implement this plan one prompt at a time. The user drives pacing — they will say "give me prompt N" and you deliver ONLY that prompt. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the existing 6-step member onboarding (`src/pages/Onboarding.jsx`) with a polished, animated 9-screen flow for the `consumer`/`gym_member` role.

**Architecture:** One container page (`Onboarding.jsx`) owns step state + an `answers` object + a data-driven `STEPS` config; each screen is a focused presentational component in `src/components/onboarding/` receiving props. A single Supabase `users` upsert + `progress_entries` seed runs once, during the Processing screen. Completion is stamped via `markOnboardingComplete()` on reaching Welcome-Home.

**Tech Stack:** React 18, Vite, Tailwind v4, react-router-dom, Supabase JS v2, Lucide icons.

## Global Constraints

- Target repo: `/Users/artazayaz/Desktop/gymvyn-frontend` (NOT fitforge-frontend — that dir is empty/stale).
- React + Vite + Tailwind v4.
- Colors ONLY via CSS variables from `src/index.css` (`--bg-primary`, `--bg-card`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-cta`, `--border`, `--bg-pill`, `--success`, `--success-bg`, `--error`, `--error-bg`). NEVER hardcode hex/rgb.
- Dark mode via `data-theme="dark"` on `<html>` (already handled by `ThemeContext`). Every screen must work in both modes.
- Use `useLayoutEffect` (not `useEffect`) for any theme-dependent layout measurement.
- Lucide icons only (emoji allowed where the spec explicitly lists emoji labels).
- Card radius 16px (`rounded-2xl`); borders `1px solid var(--border)`.
- Display numbers: 52px / font-weight 800.
- Inputs use `background: var(--bg-elevated)` explicitly (global default is `--bg-input`, which differs in light mode).
- Bottom sheets / modals must explicitly set a tokenized background.
- All localStorage keys use the `gv_` prefix.
- Completion criteria UNCHANGED: `!!(goal && training_days)` (see `useAuth.jsx:54,69`).
- Use `markOnboardingComplete()` from `useAuth`, NOT raw `setOnboardingComplete(true)` (the latter skips localStorage/ref stamping — latent re-check bug).

## Confirmed Product Decisions (2026-06-26)

- **Body stats retained** (height/current_weight/target_weight/age/gender) as a dedicated screen so `macroCalculator`/`DietSettingsSheet` + `progress_entries` seeding keep working. Equipment + injuries are dropped.
- **Goal: keep existing enum** `muscle | weight_loss | fitness | performance | health`. New emoji/copy, 1:1 mapping. "Find a gym" is NOT a goal — that intent is captured by the Priorities screen's `gym_features` option.
- **Experience: reuse existing `experience` column**, extend values to `beginner | returning | intermediate | advanced` (adds `returning`). No `experience_level` column.
- **New field:** `priorities text[]` (multi-select, max 3).

## Goal option → enum mapping (Screen 2 content)

| Emoji | Label | Sub | stored `goal` |
|-------|-------|-----|---------------|
| 💪 | Build muscle | Gain size and strength | `muscle` |
| 🔥 | Lose fat | Burn fat, lean out | `weight_loss` |
| 🏃 | Get fitter | Improve endurance & energy | `fitness` |
| ⚡ | Boost performance | Athletic edge | `performance` |
| 🧘 | Stay consistent | Habit & balance | `health` |

> ⚠️ CONFIRM AT REVIEW: This swaps the brief's literal "Get consistent / Track my progress / Find a gym" for the 5 real enum values. "Track progress" and "Find a gym" live in Priorities instead.

## Experience option → value mapping (Screen 3 content)

| Emoji | Label | Sub | stored `experience` |
|-------|-------|-----|---------------------|
| 🌱 | Just starting | Less than 6 months | `beginner` |
| 🔄 | Coming back to it | Took a break | `returning` |
| 💪 | Regular lifter | 6+ months consistent | `intermediate` |
| 🏆 | Advanced | Years of training | `advanced` |

## Priorities option → value mapping (Screen 5 content, max 3)

| Emoji | Label | stored value |
|-------|-------|--------------|
| 📝 | Logging my workouts | `workout_logging` |
| 📊 | Seeing my progress | `progress_tracking` |
| 🎯 | Knowing what to do each day | `exercise_guidance` |
| 🏋️ | Connecting to my gym | `gym_features` |
| 🥗 | Tracking my diet | `diet` |
| 👥 | Community & accountability | `community` |

## File Structure

- Modify: `src/pages/Onboarding.jsx` — rewrite as state container + step machine.
- Create: `src/components/onboarding/onboardingConfig.js` — STEPS order, option data, label maps.
- Create: `src/components/onboarding/OnboardingProgress.jsx` — animated top progress bar.
- Create: `src/components/onboarding/OptionCard.jsx` — shared selectable card (goal/experience/priorities).
- Create: `src/components/onboarding/ScreenWelcome.jsx`
- Create: `src/components/onboarding/ScreenGoal.jsx`
- Create: `src/components/onboarding/ScreenExperience.jsx`
- Create: `src/components/onboarding/ScreenFrequency.jsx`
- Create: `src/components/onboarding/ScreenPriorities.jsx`
- Create: `src/components/onboarding/ScreenBodyStats.jsx`
- Create: `src/components/onboarding/ScreenPreview.jsx`
- Create: `src/components/onboarding/ScreenProcessing.jsx`
- Create: `src/components/onboarding/ScreenWelcomeHome.jsx`
- Modify: `src/index.css` — add onboarding transition keyframes (slide/fade) once, in Prompt 2.
- Create: `migrations/2026-06-26_member_onboarding.sql` — RUN MANUALLY IN SUPABASE DASHBOARD.
- Verify (no change expected): `src/hooks/useAuth.jsx` completion check.

## Flow / screen order (9 screens)

1. Welcome → 2. Goal → 3. Experience → 4. Frequency → 5. Priorities → 6. Body Stats → 7. Personalised preview → 8. Processing → 9. Welcome home.
Progress bar shows on screens 1–7 (selection/data screens); hidden on 8 (Processing) and 9 (Welcome home). `total` is derived from the STEPS array so the count stays correct.

## Per-screen state model (`answers`)

```js
{
  goal: '',            // enum string
  experience: '',      // enum string (incl. 'returning')
  trainingDays: 0,     // integer 2..6
  priorities: [],      // string[], max 3
  height: '', currentWeight: '', targetWeight: '', age: '', gender: '',
}
```

## Verification model (every prompt)

This is a UI flow; per-phase verification is browser-based (per superpowers:verification-before-completion), not unit tests:
1. `npm run dev` (or reuse running server via preview tools).
2. Walk the screen in LIGHT and DARK mode.
3. Check browser console for errors/warnings.
4. For data screens: confirm the value lands in the `answers` state (and after Processing, in Supabase `users`).
5. Screenshot proof before marking the phase done.

---

## Prompt 1: Migration SQL + completion-check verification

**Files:**
- Create: `migrations/2026-06-26_member_onboarding.sql`
- Verify: `src/hooks/useAuth.jsx:41,54,69`

**Produces:** `users.priorities text[]`; `users.experience` accepts `returning`.

- [ ] **Step 1:** Inspect current `users` table for an `experience` CHECK constraint and confirm `goal`/`training_days` columns exist (Supabase MCP `list_tables`, or dashboard).
- [ ] **Step 2:** Write `migrations/2026-06-26_member_onboarding.sql`:

```sql
-- 2026-06-26 Member onboarding rebuild
-- RUN MANUALLY IN THE SUPABASE DASHBOARD SQL EDITOR. DO NOT RUN FROM APP CODE.

-- 1) New: priorities (multi-select, max 3 enforced in UI)
alter table public.users
  add column if not exists priorities text[] default '{}'::text[];

-- 2) Reuse experience; allow the new 'returning' value.
-- If a CHECK constraint restricts experience, drop & recreate it. Adjust the
-- constraint name to match what Step 1 found (commonly users_experience_check).
do $$
begin
  if exists (select 1 from information_schema.constraint_column_usage
             where table_name = 'users' and column_name = 'experience') then
    execute 'alter table public.users drop constraint if exists users_experience_check';
  end if;
end $$;

alter table public.users
  add constraint users_experience_check
  check (experience is null or experience in
    ('beginner','returning','intermediate','advanced'));
```

- [ ] **Step 3:** Confirm completion check still reads `goal` + `training_days` for `consumer` and `gym_member` (no code change needed). Note in PR that `priorities`/`experience` are NOT part of completion.
- [ ] **Step 4:** User runs the SQL in Supabase; verify columns via `select column_name from information_schema.columns where table_name='users'`.
- [ ] **Step 5:** Commit `git add migrations/ && git commit -m "feat(onboarding): add priorities column + extend experience values"`.

---

## Prompt 2: Screen 1 Welcome + routing scaffold + progress bar

**Files:** rewrite `src/pages/Onboarding.jsx` (container + step state), create `onboardingConfig.js`, `OnboardingProgress.jsx`, `ScreenWelcome.jsx`; modify `src/index.css` (transition keyframes).

**Interfaces produced:**
- `Onboarding` container holds `step` + `answers` + `setAnswers`, renders current screen, passes `onNext`/`onBack`.
- `<OnboardingProgress current={n} total={t} />` — thin top bar, fill color `var(--text-cta)`, animated width transition (transitions-dev).
- `OptionCard` interface defined here for later prompts: `{ emoji, label, sub, selected, onSelect, multi }`.

- [ ] Build container with a `STEPS` array (ids: welcome, goal, experience, frequency, priorities, stats, preview, processing, welcomehome). Progress visible for steps 1–7.
- [ ] Welcome: headline "Your fitness, finally in one place.", subhead "Workouts, progress, your gym — all in Gymvyn.", styled Home mockup (use `src/assets/hero.png` if suitable, else a tokenized card mockup), CTA "Get Started".
- [ ] Apply emil-design-eng + make-interfaces-feel-better polish; transitions-dev for the progress bar + screen enter.
- [ ] Verify in browser (light+dark), console clean, screenshot. Commit.

---

## Prompt 3: Screen 2 Goal

**Files:** create `ScreenGoal.jsx`, extend `onboardingConfig.js` with goal options; create `OptionCard.jsx` if not yet.
- [ ] Question "What brings you to Gymvyn?", single-select 5 options per the Goal mapping table; selection highlights with `border-2 border-[var(--text-cta)]`; reveal "Continue".
- [ ] Save to `answers.goal` (enum value). Verify state + light/dark + console. Commit.

---

## Prompt 4: Screen 3 Experience
**Files:** create `ScreenExperience.jsx`, add experience options to config.
- [ ] Question "How long have you been training?", single-select 4 options per Experience mapping. Save `answers.experience`. Verify + commit.

---

## Prompt 5: Screen 4 Frequency
**Files:** create `ScreenFrequency.jsx`.
- [ ] Question "How many days a week can you train?", single-select large tappable pills/circles for 2,3,4,5,6. Display the selected number at 52px/800. Save integer to `answers.trainingDays`. Verify + commit.

---

## Prompt 6: Screen 5 Priorities
**Files:** create `ScreenPriorities.jsx`, add priorities options to config.
- [ ] Question "What matters most to you?", multi-select max 3 per Priorities mapping; block the 4th selection (subtle feedback). Save `answers.priorities` (string[]). Verify + commit.

---

## Prompt 7: Screen 6 Body Stats (retained per decision A)
**Files:** create `ScreenBodyStats.jsx`.
- [ ] Inputs height(cm)/current(kg)/target(kg)/age(yrs) + gender pills (male/female/prefer_not_to_say). Inputs use `var(--bg-elevated)` background. Required to continue: height, currentWeight, age, gender (target optional). Save to answers. Verify + commit.

---

## Prompt 8: Screen 7 Personalised preview
**Files:** create `ScreenPreview.jsx`.
- [ ] Headline "Your Gymvyn is ready." Mirror line "[Goal label] × [trainingDays] days/week × [Experience label]" using label maps. One sample workout card built from `exercise_metadata` (query by muscle/goal + experience difficulty; reuse the query shape from `ExercisePicker.jsx:61`). One stat preview ("You'll be tracking N exercises in your first month"). CTA "Looks good". Verify + commit.

---

## Prompt 9: Screen 8 Processing
**Files:** create `ScreenProcessing.jsx`.
- [ ] Animated loader (CSS only, transitions-dev — no heavy libs). Rotating text: "Setting up your dashboard..." → "Personalising your plan..." → "Almost there..." over 1.8s total (~600ms each). On mount, run the single Supabase save: `users.upsert({ id, full_name, goal, experience, training_days, priorities, height, current_weight, target_weight, age, gender }, { onConflict:'id' })` with the existing 3-retry pattern; then seed `progress_entries` with current_weight ("Starting weight"). On success auto-advance to Screen 9; on failure show tokenized error + retry. Verify (incl. Supabase row) + commit.

---

## Prompt 10: Screen 9 Welcome home + final wiring
**Files:** create `ScreenWelcomeHome.jsx`, finalize `Onboarding.jsx`.
- [ ] Headline "Welcome to Gymvyn, [first_name]." (first name from `user.user_metadata.full_name` or email). Subhead "Your first action: log a workout." CTA "Log my first workout" → `navigate('/workout')`. Secondary link "Explore first" → `navigate('/home')`. Call `markOnboardingComplete()` on mount of this screen. Full end-to-end walk-through in light+dark, console clean, confirm Supabase fields + completion redirect works. Commit.

---

## Self-Review

- **Spec coverage:** All 8 brief screens covered (Prompts 2–6, 8–10) + retained Body Stats (Prompt 7) + migration/completion (Prompt 1). Progress bar = Prompt 2 + applied per-screen. ✓
- **Decisions honored:** goal enum kept (B), experience reused + `returning` (C), body stats retained (A), `priorities text[]` added. ✓
- **Type consistency:** `answers` shape fixed in Prompt 2; `OptionCard` props fixed in Prompt 2; save payload in Prompt 9 matches existing `users` columns + new `priorities`. ✓
- **Open item to confirm with user:** Screen 2 goal copy substitution (see ⚠️ above).
