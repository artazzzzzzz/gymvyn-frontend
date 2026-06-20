// @ts-check
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/member_3.json' });

test.describe('Rookie member — TEST_FF Member 3 (L1/50 XP)', () => {
  test('1. Home loads without crash on low XP state', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Internal Server Error|TypeError/i);
    expect(text.length).toBeGreaterThan(30);
  });

  test('2. /xp shows Rookie / Level 1 / 50 XP', async ({ page }) => {
    await page.goto('/xp');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/Rookie|Level 1|50/);
  });

  test('3. /leaderboard renders all 3 tiers (Rookie present)', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForTimeout(4000);
    await expect(page.getByText('Rookie').first()).toBeVisible({ timeout: 10_000 });
  });

  test('4. /progress renders empty state without crash (no photos for member_3)', async ({ page }) => {
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto('/progress');
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(failed.length, `5xx: ${failed.join('\n')}`).toBe(0);
  });

  test('5. /community renders global feed', async ({ page }) => {
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto('/community');
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(failed.length, `5xx: ${failed.join('\n')}`).toBe(0);
  });
});
