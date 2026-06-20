// @ts-check
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/owner_1.json' });

const MEMBER_1_ID = '1d079a55-fcdd-4613-99e7-64042d4f8d4a';

// Visit dashboard first in every test so localStorage.gymId is primed.
test.beforeEach(async ({ page }) => {
  await page.goto('/gym/dashboard');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(500);
});

test.describe('Gym Owner — TEST_FF_Gym_Alpha', () => {
  test('1. Dashboard loads with gym name + Members label', async ({ page }) => {
    // beforeEach already navigated to /gym/dashboard
    await expect(page.getByText(/TEST_FF_Gym_Alpha/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('body')).toContainText(/Members/);
  });

  test('2. Members list shows 10 seeded TEST_FF members', async ({ page }) => {
    await page.goto('/gym/members');
    await expect(page.getByText(/TEST_FF Member/).first()).toBeVisible({ timeout: 15_000 });
    const count = await page.getByText(/TEST_FF Member/).count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('3. Member detail loads with full_name visible (not "—")', async ({ page }) => {
    await page.goto(`/gym/members/${MEMBER_1_ID}`);
    await expect(page.getByText('TEST_FF Member 1').first()).toBeVisible({ timeout: 15_000 });
    // Should not show the placeholder dash where the name would be
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/Name:\s*—/);
  });

  test('4. Payments page loads', async ({ page }) => {
    await page.goto('/gym/payments');
    await page.waitForLoadState('networkidle').catch(() => {});
    // No error toast / no 5xx visible text
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Error 5\d\d|Internal Server Error/i);
  });

  test('5. Schedule page renders + Add Class sheet opens', async ({ page }) => {
    await page.goto('/gym/schedule');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.getByRole('button', { name: /Add Class/i }).first().click({ timeout: 10_000 });
    await expect(page.getByPlaceholder(/Morning Yoga/i)).toBeVisible({ timeout: 5_000 });
  });

  test('6. Announcements: 2 seeded visible', async ({ page }) => {
    await page.goto('/gym/announcements');
    await expect(page.getByText('TEST_FF Welcome')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('TEST_FF Urgent')).toBeVisible();
  });

  test('7. Trainers page lists gym-affiliated trainers (Gym A + Gym B)', async ({ page }) => {
    await page.goto('/gym/trainers');
    await expect(page.getByText('TEST_FF Trainer Gym A')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('TEST_FF Trainer Gym B')).toBeVisible();
    // Independent trainer (trainer_1) should NOT be in this gym's list
    await expect(page.getByText('TEST_FF Trainer Indep')).toHaveCount(0);
  });

  test('8. Settings page loads with gym name in name input', async ({ page }) => {
    await page.goto('/gym/settings');
    await expect(page.locator('input[value="TEST_FF_Gym_Alpha"]')).toBeVisible({ timeout: 15_000 });
  });

  test('9. Settings: Save button is visible (lockers toggle UI exists)', async ({ page }) => {
    await page.goto('/gym/settings');
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 10_000 });
  });

  test('10. Check-in page renders (QR or scanner UI)', async ({ page }) => {
    await page.goto('/gym/checkin');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Either a canvas (camera/QR), an SVG (QR code), or a manual input visible
    const interactive = page.locator('canvas, svg, input').first();
    await expect(interactive).toBeVisible({ timeout: 15_000 });
  });

  test('11. Insights page loads without 5xx', async ({ page }) => {
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto('/gym/insights');
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    expect(failed.length, `5xx responses: ${failed.join('\n')}`).toBe(0);
  });

  test('12. Supplements: 4 seeded active products visible', async ({ page }) => {
    await page.goto('/gym/supplements');
    await expect(page.getByText('TEST_FF Whey Protein 1kg')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('TEST_FF Creatine 300g')).toBeVisible();
    await expect(page.getByText('TEST_FF Pre-workout')).toBeVisible();
    await expect(page.getByText('TEST_FF Multivitamin')).toBeVisible();
  });

  test('13. Supplements: create PLAYWRIGHT_TEST product (unique per run)', async ({ page }) => {
    const name = `PLAYWRIGHT_TEST Product ${Date.now()}`;
    await page.goto('/gym/supplements');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.getByRole('button', { name: /New Product/i }).first().click({ timeout: 10_000 });
    await page.getByPlaceholder(/Whey Protein/i).fill(name);
    await page.locator('input[type="number"]').first().fill('999');
    await page.getByRole('button', { name: /^Add Product$|^Save$/i }).last().click();
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  });

  test('14. Supplements: Orders tab loads', async ({ page }) => {
    await page.goto('/gym/supplements');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.getByRole('button', { name: /^Orders/ }).first().click({ timeout: 10_000 });
    await page.waitForTimeout(800);
    // Either order rows or an empty state visible — assert not error
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/Internal Server Error|TypeError/i);
  });

  test('15. Expenses: at least one seeded expense visible', async ({ page }) => {
    await page.goto('/gym/expenses');
    await expect(page.getByText(/TEST_FF .* expense/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('16. Expenses: total / summary card renders', async ({ page }) => {
    await page.goto('/gym/expenses');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Summary shows ₹ amount somewhere
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/₹/);
  });

  test('17. Lockers: 6 seeded labels visible', async ({ page }) => {
    await page.goto('/gym/lockers');
    await page.waitForLoadState('networkidle').catch(() => {});
    for (const label of ['A1', 'A2', 'VIP-1', 'VIP-2', 'B1', 'B2']) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test('18. Lockers: create PWT_<ts> via "+ Add" button', async ({ page }) => {
    await page.goto('/gym/lockers');
    await page.waitForLoadState('networkidle').catch(() => {});
    const label = 'PWT_' + Date.now();
    await page.getByRole('button', { name: /^\+ Add$/ }).click({ timeout: 10_000 });
    await expect(page.getByText('Add Locker').first()).toBeVisible();
    await page.getByPlaceholder(/A1, VIP-1/i).fill(label);
    await page.getByRole('button', { name: /Add Locker/i }).last().click();
    await expect(page.getByText(label).first()).toBeVisible({ timeout: 10_000 });
  });
});
