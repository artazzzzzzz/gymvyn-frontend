// @ts-check
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.js';

test('smoke: owner_1 can log in and reach /gym/dashboard with TEST_FF_Gym_Alpha visible', async ({ page }) => {
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`CONSOLE: ${m.text()}`); });

  await loginAs(page, 'owner_1');
  await page.goto('/gym/dashboard');
  await expect(page.getByText(/TEST_FF_Gym_Alpha/i)).toBeVisible({ timeout: 15_000 });
  if (consoleErrors.length) {
    console.warn('Console errors during smoke:', consoleErrors);
  }
});
