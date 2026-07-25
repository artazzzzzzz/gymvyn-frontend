# Icon Container Dark Mode Audit — Phase 5

Audit of icon-in-rounded-container patterns across `src/pages/` and `src/components/`.

---

## ISSUES FOUND AND FIXED

### 1. Play button icon — TrainerExerciseDetail.jsx:235
- **Pattern:** `<span className="text-black text-xl ml-1">▶</span>` inside `bg-[var(--bg-card)]` circle
- **Dark mode issue:** black icon on dark-brown card background — nearly invisible
- **Fix:** `text-black` → `text-[var(--text-primary)]`

### 2. Skeleton loading state — TrainerExerciseDetail.jsx:53
- **Pattern:** `bg-gray-200 rounded-lg` skeleton placeholder
- **Dark mode issue:** gray-200 (#e5e7eb) is a light neutral — visible as a bright flash in dark mode
- **Fix:** `bg-gray-200` → `bg-[var(--bg-pill)]`

### 3. MoreSheet row separator — MoreSheet.jsx:341
- **Pattern:** `border-t border-black/[0.05]` divider between list items
- **Dark mode issue:** `rgba(0,0,0,0.05)` on a dark background = nearly invisible (contrast ratio < 1.1:1)
- **Fix:** `border-black/[0.05]` → `border-[var(--border)]`

### 4. Settings gear hover — GymDashboard.jsx:333
- **Pattern:** `hover:bg-gray-200` on settings icon button
- **Dark mode issue:** gray-200 = #e5e7eb (light gray) renders as a bright hover in dark mode
- **Fix:** `hover:bg-gray-200` → `hover:bg-[var(--bg-hover)]`

### 5. ExerciseLibrary sticky headers — ExerciseLibrary.jsx:105,111
- **Pattern:** `border-b border-black/5` on fixed header dividers
- **Dark mode issue:** `rgba(0,0,0,0.05)` invisible on dark surface
- **Fix:** `border-black/5` → `border-[var(--border)]`

### 6. ExerciseLibrary tab button — ExerciseLibrary.jsx:140
- **Pattern:** `border border-black/10` on inactive tab chips
- **Dark mode issue:** invisible border in dark mode
- **Fix:** `border-black/10` → `border-[var(--border)]`

### 7. Progress time-range selector — Progress.jsx:906
- **Pattern:** `bg-[var(--text-primary)] text-white` active tab button
- **Dark mode issue:** `--text-primary` = #F5F0E8 in dark mode (near-white), so `text-white` has no contrast
- **Fix:** `text-white` → `text-[var(--bg-primary)]`

### 8. Progress chart label border — Progress.jsx:1015
- **Pattern:** `border border-black/10` tooltip/label box
- **Dark mode issue:** invisible border in dark mode
- **Fix:** `border-black/10` → `border-[var(--border)]`

---

## CLEAN — NO ISSUES

| File | Notes |
|------|-------|
| `src/components/BottomNav.jsx` | Uses `var(--text-primary)` / `var(--text-tertiary)` ✓ |
| `src/components/GymBottomNav.jsx` | Uses `text-[var(--text-primary)]` / `text-[var(--text-tertiary)]` ✓ |
| `src/components/TrainerBottomNav.jsx` | Uses `var(--text-primary)` / `var(--text-tertiary)` ✓ |
| `src/pages/gym/GymDashboard.jsx` (icons) | QuickActionCard icons use `stroke: 'var(--success)'` — intentional ✓ |
| `src/pages/TrainerDashboard.jsx` | All SVGs use `currentColor` or `C.sub` (var(--text-secondary)) ✓ |
| `src/pages/MyGym.jsx` (action triplet) | Uses `bg-[var(--bg-pill)]` with `stroke="var(--text-primary)"` SVGs ✓ |
| `src/components/MoreSheet.jsx` (icon tiles) | Uses `bg-[var(--bg-pill)]` with `stroke="currentColor"` SVGs ✓ |
| `src/pages/Home.jsx` (quick-action tiles) | Already fixed in Phase 4 ✓ |
| `src/pages/Progress.jsx` (`bg-emerald-500 text-black` buttons) | Intentional — emerald is bright enough for black text contrast ✓ |
| `src/pages/LiveSession.jsx`, `FormCoachModal.jsx`, `AddMemberModal.jsx` | Intentionally dark surfaces (bg-gray-900 + border-white/x) ✓ |

---

## INTENTIONAL (leave as-is)

- `src/pages/Progress.jsx:29` — `bg-gray-800 border border-white/10` chip: intentionally dark element (dark-surface chip)
- `src/pages/GymAnnouncements.jsx` — `border-white/[0.10]` on intentionally dark surface
- `src/pages/Signup.jsx`, `src/pages/Login.jsx` — `border-white/[0.05]` on intentionally dark hero section
