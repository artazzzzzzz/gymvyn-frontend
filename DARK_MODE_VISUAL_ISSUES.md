# Dark Mode Visual Issues

All previously-open issues have been resolved.

---

## RESOLVED

### consumer-dark-home ✓
- **File:** `src/pages/Home.jsx`
- **Fix:** Replaced all `background: 'white'` → `background: 'var(--bg-card)'` and `border: '0.5px solid rgba(0,0,0,0.08)'` → `border: '0.5px solid var(--border)'` on workout card, stat tiles, quick-action tiles, trainer card, and activity items.

### consumer-dark-settings ✓
- **File:** `src/pages/Settings.jsx`
- **Fix:** Replaced `backgroundColor: 'white'` → `backgroundColor: 'var(--bg-card)'` on sticky header, profile hero, PROFILE/FITNESS/BODY STATS/ACCOUNT/APPEARANCE section cards, stepper buttons, and bottom sheets. Replaced all `rgba(0,0,0,...)` border literals with `var(--border)`. Fixed PillSelector selected text color → `var(--bg-primary)`. Fixed appearance rows to use `transparent` instead of `white` for unselected state.

### trainer-dark-settings ✓
- **File:** `src/pages/TrainerSettings.jsx`
- **Fix:** Replaced all `background: 'white'` → `background: 'var(--bg-card)'` on profile card, trainer/account section divs, edit profile sheet, and bottom nav. Replaced all `rgba(0,0,0,...)` borders → `var(--border)`. Fixed specialization button and delete confirm box colors.

### trainer-dark-templates ✓
- **File:** `src/pages/TrainerTemplates.jsx`
- **Fix:** Replaced `background: 'white'` → `background: 'var(--bg-card)'` on template cards and bottom nav. Fixed tab button inactive state → `var(--bg-card)` bg / `var(--bg-primary)` text. Replaced all `rgba(0,0,0,...)` border literals.

---

## INTENTIONAL (leave as-is)

### gymOwner-dark-checkin (camera area)
The QR scanner camera preview area renders as black — this is the actual camera viewport, intentionally always dark regardless of app theme.

### consumer-dark-my-gym (membership card)
The gym membership card uses a radial-gradient dot pattern — intentional "physical card" design. No hardcoded `background: 'white'` in MyGym.jsx.

### gymOwner-dark-insights (chart bars)
Revenue bar chart uses `fill="var(--text-cta)"` — in dark mode this resolves to `#E6C99A` (light warm tan). Correct accent color; leave as-is.
