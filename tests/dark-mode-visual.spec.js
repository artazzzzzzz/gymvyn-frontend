/**
 * Dark mode visual regression tests.
 *
 * Snapshots locked in via `npm run test:dark-update`.
 * Run `npm run test:dark-visual` to verify against baseline.
 *
 * When intentionally changing dark mode styling:
 *   1. Make the change
 *   2. Run `npm run test:dark-update` to regenerate baselines
 *   3. Manually review each updated snapshot before committing
 *   4. Commit both spec changes and snapshot changes together
 *
 * Surfaces tested: consumer (12), gym owner (11), trainer (5) — both themes = 56 snapshots total.
 *
 * Skipped: AI Chat (Gemini cost), Form Coach (needs camera),
 * progress photo upload (Cloudinary), barcode scan (camera + QuaggaJS).
 */

// @ts-check
import { test, expect } from '@playwright/test';

// ── viewport: mobile iPhone 11-ish ───────────────────────────────────────────
test.use({ viewport: { width: 414, height: 896 } });

// ── surfaces per role ─────────────────────────────────────────────────────────
const CONSUMER_SURFACES = [
  { name: 'home',             path: '/home' },
  { name: 'workout',          path: '/workout' },
  { name: 'exercise-library', path: '/exercise-library' },
  { name: 'diet',             path: '/diet' },
  { name: 'progress',         path: '/progress' },
  { name: 'community',        path: '/community' },
  { name: 'xp',               path: '/xp' },
  { name: 'leaderboard',      path: '/leaderboard' },
  { name: 'my-gym',           path: '/my-gym' },
  { name: 'my-trainer',       path: '/my-trainer' },
  { name: 'settings',         path: '/settings' },
  { name: 'supplements',      path: '/my-gym/supplements' },
];

const GYM_OWNER_SURFACES = [
  { name: 'dashboard',   path: '/gym/dashboard' },
  { name: 'members',     path: '/gym/members' },
  { name: 'payments',    path: '/gym/payments' },
  { name: 'schedule',    path: '/gym/schedule' },
  { name: 'trainers',    path: '/gym/trainers' },
  { name: 'settings',    path: '/gym/settings' },
  { name: 'insights',    path: '/gym/insights' },
  { name: 'supplements', path: '/gym/supplements' },
  { name: 'expenses',    path: '/gym/expenses' },
  { name: 'lockers',     path: '/gym/lockers' },
  { name: 'checkin',     path: '/gym/checkin' },
];

const TRAINER_SURFACES = [
  { name: 'dashboard', path: '/trainer/dashboard' },
  { name: 'clients',   path: '/trainer/clients' },
  { name: 'templates', path: '/trainer/templates' },
  { name: 'chat',      path: '/trainer/chat' },
  { name: 'settings',  path: '/trainer/settings' },
];

// ── role configs ──────────────────────────────────────────────────────────────
const ROLE_CONFIGS = [
  {
    key: 'consumer',
    storageState: 'tests/.auth/member_1.json',
    surfaces: CONSUMER_SURFACES,
    needsGymPrime: false,
  },
  {
    key: 'gymOwner',
    storageState: 'tests/.auth/owner_1.json',
    surfaces: GYM_OWNER_SURFACES,
    needsGymPrime: true, // must visit /gym/dashboard first so gymId is in localStorage
  },
  {
    key: 'trainer',
    storageState: 'tests/.auth/trainer_1.json',
    surfaces: TRAINER_SURFACES,
    needsGymPrime: false,
  },
];

// ── surfaces with known dark-mode bugs — SKIP until fixed ────────────────────
// Each entry: `${role}-${theme}-${name}` key format.
// Add here when a surface has a confirmed rendering bug you don't want to lock in.
const KNOWN_BUGGY = new Set([
  // All previously-buggy surfaces fixed — set is now empty.
]);

// ── helpers ───────────────────────────────────────────────────────────────────

/** Mask elements that change every run and would cause snapshot flakes. */
async function maskVolatile(page) {
  await page.evaluate(() => {
    // Relative timestamps ("2 min ago", "yesterday", "Jun 12" etc.)
    const tsSelectors = [
      '[data-timestamp]',
      'time',
    ];
    tsSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.visibility = 'hidden';
      });
    });

    // Progress photos / user-uploaded images (avoid snapshot diffs from real photo content)
    document.querySelectorAll('img[src*="storage"], img[src*="photo"], img[src*="avatar"]').forEach(el => {
      el.style.visibility = 'hidden';
    });
  });
}

/** Disable CSS animations/transitions to stabilise screenshots. */
async function freezeAnimations(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0ms !important;
        animation-delay: 0ms !important;
        transition-duration: 0ms !important;
        transition-delay: 0ms !important;
      }
    `,
  });
}

// ── build test matrix ─────────────────────────────────────────────────────────
for (const theme of ['light', 'dark']) {
  for (const role of ROLE_CONFIGS) {
    test.describe(`${role.key} • ${theme} mode`, () => {
      test.use({ storageState: role.storageState });

      // Set gv_theme in localStorage before every page navigation in this context.
      // This runs before the pre-paint inline script in index.html, ensuring
      // the correct theme is applied from first paint (no FOUC).
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((t) => {
          localStorage.setItem('gv_theme', t);
        }, theme);
      });

      for (const surface of role.surfaces) {
        const bugKey = `${role.key}-${theme}-${surface.name}`;
        const isBuggy = KNOWN_BUGGY.has(bugKey);

        // Use test.skip for known-buggy surfaces so baseline doesn't lock in the bug.
        const testFn = isBuggy ? test.skip : test;

        testFn(`${surface.name}`, async ({ page }) => {
          // Gym owner must seed gymId in localStorage by visiting the dashboard first.
          if (role.needsGymPrime && surface.path !== '/gym/dashboard') {
            await page.goto('/gym/dashboard');
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.waitForTimeout(400);
          }

          await page.goto(surface.path);
          await page.waitForLoadState('networkidle').catch(() => {});

          // Extra settle for charts (Recharts animates on mount) and lazy images.
          await page.waitForTimeout(600);

          await freezeAnimations(page);
          await maskVolatile(page);

          // One final tick for any React state updates triggered by masking.
          await page.waitForTimeout(100);

          await expect(page).toHaveScreenshot(
            `${role.key}-${theme}-${surface.name}.png`,
            {
              fullPage: true,
              maxDiffPixelRatio: 0.02,
              animations: 'disabled',
            },
          );
        });
      }
    });
  }
}
