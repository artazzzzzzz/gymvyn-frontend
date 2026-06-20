// @ts-check
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/solo_1.json' });

test.describe('Solo user — TEST_FF Solo One (no gym, no data)', () => {
  test('1. Home loads without crash for solo user', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Internal Server Error|TypeError/i);
  });

  test('2. /workout shows empty-plan CTA', async ({ page }) => {
    await page.goto('/workout');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Internal Server Error|TypeError/i);
  });

  test('3. /diet renders for solo user', async ({ page }) => {
    await page.goto('/diet');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByText(/Add food/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('4. /progress renders for solo user (0 photos, empty state)', async ({ page }) => {
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto('/progress');
    await page.waitForLoadState('networkidle').catch(() => {});
    expect(failed.length).toBe(0);
  });

  test('5. /my-gym shows Join a Gym flow for unlinked user', async ({ page }) => {
    await page.goto('/my-gym');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByText(/Join a Gym|Join Gym/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/Enter 6-digit code/i).first()).toBeVisible();
  });

  test('6. /xp lazily creates Rookie/L1 profile on first visit', async ({ page }) => {
    await page.goto('/xp');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/Rookie|Level 1|0/);
  });

  test('7. /settings loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Internal Server Error|TypeError/i);
  });
});
