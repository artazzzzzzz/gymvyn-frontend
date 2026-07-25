# Dark Mode Unresolved Cases

This file tracks hardcoded colors that did not get token-replaced during the dark-mode migration. It is split into:

- **RESOLVED** — kept here as a changelog of how each issue was handled
- **INTENTIONAL — DO NOT FIX** — confirmed not-to-be-themed
- **OPEN** — still pending design/product decision

---

## RESOLVED

### Camera/scanner viewports — RESOLVED via `--bg-camera`
`src/pages/gym/GymCheckin.jsx:197`, `src/components/BarcodeScanner.jsx:140`, `src/components/FormCoachModal.jsx:304`
Now use `var(--bg-camera)` (literal `#1A1A1A` in both modes — camera feed legibility requires constant dark surround).

### Chat surfaces — RESOLVED
`src/pages/Chat.jsx`, `src/pages/ChatWindow.jsx`, `src/pages/ClientChatPage.jsx`
Bubbles use `--bg-elevated` (own) / `--bg-card` (other), composer uses standard tokens, zinc-glass colors fully migrated.

### Emerald blur halos — RESOLVED via `.halo-decoration` class
`src/pages/GymAnnouncements.jsx:304`, `src/pages/GymComingSoon.jsx:18`, `src/pages/GymImport.jsx:141`, `src/pages/gym/BecomeGymOwner.jsx:75`
Halo divs now have `halo-decoration` class which uses `display:none` in light mode and `display:block` in dark mode (CSS attribute selector — Tailwind v4 dark variant wasn't configured for our `[data-theme="dark"]` selector). Color shifted from emerald to `rgba(212,181,117,0.08)` warm gold.

### Muscle group palette — RESOLVED via `--muscle-*` tokens
`src/components/ExercisePicker.jsx`, `src/pages/ExerciseLibrary.jsx`, `src/pages/FormCoach.jsx`
Per-muscle text colors now reference `--muscle-chest/back/shoulders/arms/legs/core/cardio`. Backgrounds collapsed to `--bg-pill`. Dark-mode palette is desaturated/warmer.

### Heatmap palette — RESOLVED via `--heatmap-*` tokens
`src/pages/gym/GymInsights.jsx:60-66, 256`
5-stop scale + gradient legend now use `--heatmap-0..4`. Light mode keeps original blue. Dark mode is warm amber→sage.

### PaymentStatusPill / ClassTypeChip / ChurnRiskCard / status-bg pills — PARTIALLY RESOLVED via `--*-bg` tokens
Prompts 2B/2C added `--success-bg`, `--warning-bg`, `--error-bg`, `--xp-gold-bg`, `--streak-bg`. Most status pills now use these. Some legacy tinted bgs in trainer/categorical contexts remain (see OPEN below).

---

## INTENTIONAL — DO NOT FIX

### Theme picker preview chips — `src/pages/Settings.jsx:27-50`, `src/pages/gym/GymSettings.jsx`
Literal `#0F0F0F` / `#185FA5` / `#4A9EE0` etc. inside the light/dark/system theme tile illustrations.
**Reason:** Each tile is a visual preview of the corresponding theme — must stay literal regardless of active theme.

### Google logo SVG paths — `src/pages/Login.jsx`, `src/pages/Signup.jsx`
`fill="#34A853"`, `fill="#EA4335"`, `fill="#FBBC05"`, `fill="#4285F4"` in the Google G logo `<path>`s.
**Reason:** Brand asset — cannot be themed.

### QR codes — `src/components/GymCodeCard.jsx:149`, `src/components/TrainerCodeCard.jsx:107`
`bgColor="#ffffff" fgColor="#000000"` on QRCodeSVG.
**Reason:** Scanner contrast requirement — must stay literal black-on-white.

### Shadow `rgba(0,0,0,X)` values — global
All `boxShadow: '... rgba(0,0,0,Y)'` and `shadow-*` Tailwind utilities.
**Reason:** rgba(0,0,0) over a dark bg is invisible — that's the desired behavior. Per the migration spec.

### Always-dark intentional surfaces — multiple
- `src/components/AuthRoute.jsx`, `ProtectedRoute.jsx`, `PublicRoute.jsx`, `GymOwnerRoute.jsx` — `bg-[#0c0c0e]` loading splashes
- `src/components/GymOwnerNav.jsx` — `bg-[#111113]` dark nav bar
- `src/components/FormFeedbackOverlay.jsx` — `bg-black/40..80` AR overlays over camera feed

**Reason:** Loading splashes, AR overlays, and the gym-owner nav are intentionally always-dark.

---

## OPEN — pending design decision

### Categorical palettes (multi-hue, decorative-semantic)
The following multi-hue palettes remain hardcoded across themes. They are not status colors and don't fit the existing `--success/--warning/--error/--xp-gold/--streak` family. A decision is needed whether to:
(a) Introduce dedicated token families per palette (e.g. `--expense-rent/--expense-equipment/...`), or
(b) Collapse each palette to monochrome chips in dark mode.

- **`src/components/gym/PaymentStatusPill.jsx`** — paid/unpaid/pending/partial tinted pill pairs
- **`src/components/gym/ClassTypeChip.jsx`** — 7-way class type palette (yoga teal, strength blue, zumba amber, hiit red, cardio green, pilates purple, other neutral)
- **`src/components/gym/ChurnRiskCard.jsx:7,14`** — risk-tier tinted card bg (`#FCEBEB`, `#FAEEDA`)
- **`src/pages/gym/GymExpenses.jsx`** — expense category palette (rent/equipment/salaries/utilities/marketing/maintenance/other)
- **`src/pages/gym/GymSchedule.jsx`** — class-type palette (similar to ClassTypeChip)
- **`src/utils/avatarColor.js`** — 6 alphabetic avatar palettes
- **`src/utils/xpConstants.js`** — XP multiplier + source categorical palettes
- **`src/components/FoodLoggerSheet.jsx`** — macros chart (carbs teal, fat purple, protein amber)
- **`src/pages/Diet.jsx`** — same macro palette
- **`src/pages/Leaderboard.jsx`** — medal colors (gold/silver/bronze tints)
- **`src/components/ExerciseDetailContent.jsx`** — 6 cycled exercise-tag palettes
- **`src/pages/TrainerChatPage.jsx`, `src/pages/TrainerClientDetail.jsx`** — trainer-tag categorical avatar palettes

### Solid colored CTA buttons that lost their punchy bright color
`src/pages/GymAnnouncements.jsx` "Publish" buttons were `bg-emerald-500` (bright). After substitution they use `bg-[var(--success)]` which in dark mode is muted sage (`#7A9B7E`) — less prominent. Acceptable but worth flagging.

### Settings.jsx — "Sign out" / destructive bg pills (`#FEF2F2` etc.)
Already converted to `var(--error-bg)`. Verify the destructive button still reads as destructive in dark mode.

### GymInsights heatmap — current calendar uses `--heatmap-*`
The new dark-mode warm amber→sage scale is a perceptual departure from the original blue scale. If reviewers find the warm scale less readable for "intensity," fall back to a desaturated mono ramp.
