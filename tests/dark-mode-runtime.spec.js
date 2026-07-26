/**
 * Dark mode runtime tests — no screenshots, pure behaviour assertions.
 *
 * TEST 1: Theme toggle wiring
 * TEST 2: No flash of unstyled content (FOUC) on dark first load
 * TEST 3: No hardcoded light backgrounds leaked into dark mode surfaces
 *         (SKIPPED — known issues in TrainerTemplates.jsx + DietSettingsSheet.jsx,
 *          see docs/DARK_MODE_VISUAL_ISSUES.md for the full list)
 */

// @ts-check
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 414, height: 896 } });

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1 — Theme toggle wiring
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TEST 1 — theme toggle wiring', () => {
  test.use({ storageState: 'tests/.auth/member_1.json' });

  // NOTE: NO addInitScript here — TEST 1 manages localStorage directly so that
  // the post-toggle reload can verify theme persistence. An addInitScript that
  // sets gv_theme would re-run on reload and override the toggled value.

  test('toggling theme in Settings flips data-theme and persists across reload', async ({ page }) => {
    // Prime localStorage to light before first navigation (no init script so it
    // won't run again on reload).
    await page.goto('/settings');
    await page.evaluate(() => localStorage.setItem('gv_theme', 'light'));
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});

    // Confirm we start in light mode.
    let dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBeNull(); // light mode = no data-theme attribute

    // Click the "Dark" theme tile.
    // Settings has a sticky header (~56px). scrollIntoViewIfNeeded + scrollBy(-80)
    // ensures the tile isn't hidden behind the header when Playwright clicks it.
    const darkTile = page.getByText('Dark', { exact: true }).first();
    await darkTile.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -80));
    await page.waitForTimeout(150);
    await darkTile.click();

    // Wait for useLayoutEffect to apply the attribute (up to 3s).
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') === 'dark',
      { timeout: 3000 },
    );

    // localStorage must reflect the change.
    const stored = await page.evaluate(() => localStorage.getItem('gv_theme'));
    expect(stored).toBe('dark');

    // Reload — theme must survive (pre-paint inline script in index.html reads
    // gv_theme before React hydrates).
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(200);

    dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('dark');

    // Clean up — restore light so the auth cache stays neutral.
    await page.evaluate(() => localStorage.setItem('gv_theme', 'light'));
    await page.reload();
    await page.waitForLoadState('networkidle').catch(() => {});
    dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2 — No FOUC on dark mode first load
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TEST 2 — no FOUC on dark first load', () => {
  test.use({ storageState: 'tests/.auth/member_1.json' });

  test('--bg-primary resolves to dark value within first 100ms of navigation', async ({ page }) => {
    // Set dark theme in localStorage BEFORE the first navigation.
    await page.addInitScript(() => {
      localStorage.setItem('gv_theme', 'dark');
    });

    // Intercept the DOMContentLoaded event to read the CSS variable value
    // immediately after scripts run but before React hydration completes.
    let bgPrimaryAtDCL = '';
    await page.exposeFunction('__recordBgPrimary', (value) => {
      bgPrimaryAtDCL = value;
    });
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const val = getComputedStyle(document.documentElement)
          .getPropertyValue('--bg-primary')
          .trim();
        window.__recordBgPrimary(val);
      }, { once: true });
    });

    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(150); // allow the exposed function to flush

    // In dark mode --bg-primary must be the dark value (#1A1613), NOT the light value (#F7F7F5).
    // Accept both hex and rgb representations.
    const isDark =
      bgPrimaryAtDCL === '#1A1613' ||
      bgPrimaryAtDCL === '#1a1613' ||
      bgPrimaryAtDCL === 'rgb(26, 22, 19)';

    if (!isDark) {
      throw new Error(
        `FOUC detected: --bg-primary at DOMContentLoaded was "${bgPrimaryAtDCL}". ` +
        `Expected dark value (#1A1613). The pre-paint inline script in index.html may be broken.`,
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3 — No hardcoded light backgrounds in dark mode
// SKIPPED — known issues exist. See docs/DARK_MODE_VISUAL_ISSUES.md.
// TODO: un-skip after cleaning up DietSettingsSheet, TrainerTemplates,
//       TrainerTemplateBuilder, TrainerAssignPlan, LogStatsSheet.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('TEST 3 — hardcoded light bg leak check', () => {
  test.use({ storageState: 'tests/.auth/member_1.json' });

  // Light-mode background RGB strings to flag in dark mode.
  // These are the exact computed values for the light-mode CSS tokens.
  const LIGHT_BG_VALUES = new Set([
    'rgb(255, 255, 255)', // #FFFFFF  --bg-card light
    'rgb(247, 247, 245)', // #F7F7F5  --bg-primary light
    'rgb(241, 239, 232)', // #F1EFE8  --bg-pill/hover/input light
  ]);

  /**
   * Walk all visible elements on the page and return descriptors of any that
   * have a hardcoded light-mode background in dark mode.
   */
  async function findLeaks(page) {
    return page.evaluate((lightBgs) => {
      const SKIP_TAGS = new Set(['HTML', 'BODY', 'SCRIPT', 'STYLE', 'IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME']);
      const leaks = [];

      function getPath(el) {
        const parts = [];
        let cur = el;
        while (cur && cur !== document.body) {
          let seg = cur.tagName.toLowerCase();
          if (cur.id) seg += `#${cur.id}`;
          else if (cur.className && typeof cur.className === 'string') {
            seg += `.${cur.className.trim().split(/\s+/).slice(0, 2).join('.')}`;
          }
          parts.unshift(seg);
          cur = cur.parentElement;
        }
        return parts.join(' > ');
      }

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode(node) {
            // Skip invisible elements
            const style = getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        },
      );

      let node;
      while ((node = walker.nextNode())) {
        const el = /** @type {HTMLElement} */ (node);

        if (SKIP_TAGS.has(el.tagName)) continue;
        // Skip intentional always-light elements
        if (el.hasAttribute('data-allow-light-bg')) continue;
        if (el.classList.contains('halo-decoration')) continue;
        // Skip theme preview chips in Settings (they show literal theme colours)
        if (el.closest('[data-theme-picker]')) continue;

        const bg = getComputedStyle(el).backgroundColor;
        if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') continue;

        if (lightBgs.includes(bg)) {
          leaks.push({ bg, path: getPath(el), text: el.innerText?.slice(0, 40) });
        }
      }
      return leaks;
    }, [...LIGHT_BG_VALUES]);
  }

  const CONSUMER_SURFACES_TO_CHECK = [
    '/home', '/workout', '/diet', '/progress', '/settings',
  ];

  test('consumer surfaces have no hardcoded light bg in dark mode', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gv_theme', 'dark');
    });

    const allLeaks = {};

    for (const path of CONSUMER_SURFACES_TO_CHECK) {
      await page.goto(path);
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(500);

      const leaks = await findLeaks(page);
      if (leaks.length > 0) {
        allLeaks[path] = leaks;
      }
    }

    if (Object.keys(allLeaks).length > 0) {
      const report = Object.entries(allLeaks)
        .map(([path, leaks]) =>
          `  ${path}:\n${leaks.map(l => `    [${l.bg}] ${l.path} — "${l.text}"`).join('\n')}`,
        )
        .join('\n\n');
      throw new Error(
        `Hardcoded light backgrounds found in dark mode (${Object.values(allLeaks).flat().length} elements):\n\n${report}`,
      );
    }
  });
});
