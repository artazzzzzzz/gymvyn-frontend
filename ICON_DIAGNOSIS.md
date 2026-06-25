# Icon Dark Mode Diagnosis

## Files inspected

- `src/components/MoreSheet.jsx` — icon container + render JSX
- `src/components/GymCodeCard.jsx` — copy/share/QR action button triplet
- `src/components/TrainerCodeCard.jsx` — trainer code share button
- `src/index.css` — global CSS variables and base rules
- `src/App.jsx` — root wrapper element

---

## Actual rendering code

### MoreSheet.jsx items array

```jsx
// ── Icon helpers — all use stroke="currentColor" ──────────────────────────────
const IconKey = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="M21 2l-9.6 9.6"/>
    <path d="M15.5 7.5l3 3L22 7l-3-3"/>
  </svg>
)

const GYM_OWNER_BASE_ITEMS = [
  { id: 'insights',     label: 'Insights',        icon: <IconBarChart /> },
  { id: 'supplements',  label: 'Supplements',     icon: <IconPackage /> },
  { id: 'expenses',     label: 'Expense Tracker', icon: <IconReceipt /> },
  { id: 'checkin',      label: 'Check-in',        icon: <IconScan /> },
  { id: 'trainers',     label: 'Trainers',        icon: <IconUsers /> },
  { id: 'gym-settings', label: 'Settings',        icon: <IconSettings /> },
]
const LOCKERS_ITEM = { id: 'lockers', label: 'Lockers', icon: <IconKey /> }

const CONSUMER_ITEMS = [
  { id: 'community', label: 'Community', icon: <IconCommunity /> },
  { id: 'formcoach', label: 'Form Coach', icon: <IconFormCoach /> },
  { id: 'chat',      label: 'Chat',       icon: <IconChat /> },
  { id: 'settings',  label: 'Settings',   icon: <IconSettings /> },
]
```

### MoreSheet.jsx render JSX

```jsx
{items.map((item, i) => (
  <div key={item.id}>
    <button
      onClick={() => handleItemClick(item)}
      className="w-full flex items-center gap-3 py-3 px-1 active:bg-[var(--bg-primary)] rounded-xl transition-colors text-left"
      // ↑ NO color class set on button — inherits from DOM ancestors
    >
      <div className="w-10 h-10 bg-[var(--bg-pill)] rounded-xl flex items-center justify-center shrink-0">
        {item.icon}
        {/* item.icon is e.g. <IconKey /> = <svg stroke="currentColor"> */}
        {/* currentColor resolves to the inherited color CSS property */}
        {/* No color set on this div either */}
      </div>
      ...
    </button>
  </div>
))}
```

### Action triplet location

**File:** `src/components/GymCodeCard.jsx` (lines 81–142)

```jsx
<button
  onClick={copy}
  style={{
    width: 44, height: 44, flexShrink: 0,
    background: copied ? '#EAF3DE' : 'var(--bg-card)',
    border: `1px solid ${copied ? 'var(--success)' : 'var(--border)'}`,
    borderRadius: 10, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    // ↑ NO color set on button style
  }}
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor"    {/* ← inherits color from button */}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    ...
  </svg>
</button>
<button
  onClick={share}
  style={{ width: 44, height: 44, background: 'var(--bg-card)', ... }}
>
  <svg stroke="currentColor" .../>   {/* same pattern */}
</button>
<button
  onClick={() => setShowQR(v => !v)}
  style={{ width: 44, height: 44, background: showQR ? 'var(--bg-pill)' : 'var(--bg-card)', ... }}
>
  <svg stroke="currentColor" fill="currentColor" .../>  {/* same pattern */}
</button>
```

---

## Runtime computed styles (consumer MoreSheet, first icon container, dark mode)

Measured via Playwright headless inspection with `storageState: member_1.json` and `ff_theme: 'dark'`.

**Theme state at inspection time:**
- `data-theme`: `"dark"` ✓
- `--text-primary` resolves to: `#E0DAD0` ✓ (CSS variable correctly set)
- `--bg-pill` resolves to: `#2A2521` (dark brownish container background)

**Container div** (`w-10 h-10 bg-[var(--bg-pill)] rounded-xl`):
- `background-color`: `rgb(42, 37, 33)` — i.e. `#2A2521` ✓ correct dark bg
- `color`: **`rgb(0, 0, 0)`** ← BLACK — this is the bug
- `stroke`: `none`

**SVG element** (`<svg stroke="currentColor">`):
- `color`: **`rgb(0, 0, 0)`** — inherits black from container
- `stroke`: **`rgb(0, 0, 0)`** — `currentColor` resolves to inherited black

**path/circle inside SVG:**
- `stroke`: **`rgb(0, 0, 0)`**
- `fill`: `none`

**Parent chain (walking up from container div until color changes):**
```
BUTTON  .w-full.flex.items-center.gap-3.py-3.px-1...  color = rgb(0, 0, 0)
  ← chain stops here (all further ancestors also rgb(0,0,0))
```

**Body and HTML computed color:**
```
document.body color:                rgb(0, 0, 0)   ← black (browser default)
document.documentElement color:     rgb(0, 0, 0)   ← black (browser default)
```

**Contrast:** black icon (`rgb(0,0,0)`) on dark brownish container (`rgb(42,37,33)`) ≈ contrast ratio 1.05:1 — nearly invisible.

---

## Theme state at inspection time

- `data-theme`: `"dark"`
- `--text-primary` resolves to: `#E0DAD0`
- `--bg-pill` resolves to: `#2A2521`
- `body color`: `rgb(0, 0, 0)` ← **NOT** using `var(--text-primary)`

---

## Root cause hypothesis

**The icon color is being controlled by: the CSS `color` property inherited from `body`, which is the browser's default black (`rgb(0,0,0)`) because no explicit `color` is set on `body` or `html` in `index.css`.**

Specifically:

1. `src/index.css` sets `color: var(--text-primary)` only on `input, textarea, select` (line 127–130). It does **not** set `color` on `body` or `:root`.

2. All SVG icons in MoreSheet and GymCodeCard use `stroke="currentColor"`. `currentColor` resolves to the inherited CSS `color` property.

3. In light mode this is invisible (browser default black ≈ `--text-primary` light = `#111111`). In dark mode the CSS variable flips to `#E0DAD0` (warm off-white), but since `body` never receives `color: var(--text-primary)`, the body and all inheriting elements stay at browser-default black.

4. The container div uses `bg-[var(--bg-pill)]` which correctly resolves to `#2A2521` (dark brownish) in dark mode. Black icon on dark brownish background = invisible.

5. Prior Phase 5 fixes looked for explicit `text-black` / `color="#000"` in the source but found none — because the issue is the *absence* of an explicit light color, not the *presence* of a hardcoded dark one.

---

## Proposed fix

**Single change — `src/index.css`**

Add a `body` rule immediately after `:root { ... }` and `[data-theme="dark"] { ... }` blocks, before `.halo-decoration`:

```css
/* before (line ~109) */
.halo-decoration { display: none; }

/* after */
body {
  color: var(--text-primary);
}

.halo-decoration { display: none; }
```

**Why this works:**
- In light mode: `--text-primary = #111111` (near-black) → imperceptibly different from browser default black → **light mode visually unchanged**
- In dark mode: `--text-primary = #E0DAD0` (warm off-white) → all `currentColor` SVGs inherit warm off-white → icons become visible on dark pill backgrounds
- Cascades to every SVG using `stroke="currentColor"` or `fill="currentColor"` across the entire app with a single rule
- Does not affect elements with explicit `color` overrides (they stay at their own value)

**Scope of fix:** Global. Affects every element without an explicit `color`. The only risk is elements that intentionally rely on browser-default black and would look different in dark mode — but those are already broken in dark mode (which is the bug we're fixing).

**No other file needs to change.** MoreSheet and GymCodeCard icon code is already correct (`stroke="currentColor"`) — they just need the parent `body` to supply the right inherited color.
