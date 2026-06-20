// @ts-check
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/trainer_1.json' });

test.describe('Trainer (independent) — TEST_FF Trainer Indep', () => {
  test('1. Dashboard loads', async ({ page }) => {
    await page.goto('/trainer/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Page should not show a fatal error
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Internal Server Error|TypeError/i);
    // Trainer dashboard usually shows client count somewhere
    expect(text.length).toBeGreaterThan(50);
  });

  test('2. Clients list shows 3 seeded TEST_FF clients', async ({ page }) => {
    await page.goto('/trainer/clients');
    await expect(page.getByText('TEST_FF Client One')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('TEST_FF Client Two')).toBeVisible();
    await expect(page.getByText('TEST_FF Client Three')).toBeVisible();
  });

  test('3. Client One detail page loads', async ({ page }) => {
    await page.goto('/trainer/clients');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.getByText('TEST_FF Client One').first().click();
    await page.waitForURL(/\/trainer\/client\//, { timeout: 10_000 });
    await expect(page.getByText('TEST_FF Client One').first()).toBeVisible({ timeout: 10_000 });
  });

  test('4. Templates list shows seeded "TEST_FF PPL 4-day"', async ({ page }) => {
    await page.goto('/trainer/templates');
    await expect(page.getByText('TEST_FF PPL 4-day')).toBeVisible({ timeout: 15_000 });
  });

  test('5. Template builder page loads', async ({ page }) => {
    await page.goto('/trainer/templates/new');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(50);
  });

  test('6. Assign plan page loads', async ({ page }) => {
    await page.goto('/trainer/assign-plan');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Internal Server Error|TypeError/i);
  });

  test('7. Chat page lists conversations and opens Client One thread', async ({ page }) => {
    await page.goto('/trainer/chat');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByText('TEST_FF Client One').first()).toBeVisible({ timeout: 15_000 });
    await page.getByText('TEST_FF Client One').first().click();
    // Seed message visible
    await expect(page.getByText('TEST_FF hi from trainer').first()).toBeVisible({ timeout: 10_000 });
  });

  test('8. Settings page loads', async ({ page }) => {
    await page.goto('/trainer/settings');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(20);
  });

  test('9. Exercise library loads', async ({ page }) => {
    await page.goto('/trainer/exercise-library');
    await page.waitForLoadState('networkidle').catch(() => {});
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Internal Server Error|TypeError/i);
  });
});
