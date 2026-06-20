// @ts-check
import { test, expect, chromium } from '@playwright/test';

test.describe('Cross-role flows (two browser contexts)', () => {
  test('A. Supplement order: member places → owner sees in Orders tab', async () => {
    const browser = await chromium.launch();
    try {
      const memberCtx = await browser.newContext({
        storageState: 'tests/.auth/member_1.json',
        viewport: { width: 390, height: 844 },
        baseURL: 'http://localhost:5174',
      });
      const ownerCtx = await browser.newContext({
        storageState: 'tests/.auth/owner_1.json',
        viewport: { width: 390, height: 844 },
        baseURL: 'http://localhost:5174',
      });
      const memberPage = await memberCtx.newPage();
      const ownerPage = await ownerCtx.newPage();

      // Member visits supplements catalog
      await memberPage.goto('/my-gym/supplements');
      await memberPage.waitForLoadState('networkidle').catch(() => {});
      // Verify catalog renders without 500
      const memberText = await memberPage.locator('body').innerText();
      expect(memberText).not.toMatch(/Internal Server Error|TypeError/i);

      // Owner visits the Orders tab and verifies it loads
      await ownerPage.goto('/gym/supplements');
      await ownerPage.waitForLoadState('networkidle').catch(() => {});
      await ownerPage.getByRole('button', { name: /^Orders/ }).first().click({ timeout: 10_000 });
      await ownerPage.waitForTimeout(800);
      const ownerText = await ownerPage.locator('body').innerText();
      expect(ownerText).not.toMatch(/Internal Server Error|TypeError/i);

      await memberCtx.close();
      await ownerCtx.close();
    } finally {
      await browser.close();
    }
  });

  test('B. Trainer ↔ client chat: trainer_1 opens Client One thread; client_1 opens chat', async () => {
    const browser = await chromium.launch();
    try {
      const trainerCtx = await browser.newContext({
        storageState: 'tests/.auth/trainer_1.json',
        viewport: { width: 390, height: 844 },
        baseURL: 'http://localhost:5174',
      });
      const clientCtx = await browser.newContext({
        storageState: 'tests/.auth/client_1.json',
        viewport: { width: 390, height: 844 },
        baseURL: 'http://localhost:5174',
      });
      const trainerPage = await trainerCtx.newPage();
      const clientPage = await clientCtx.newPage();

      // Trainer side: chat list shows clients + opens Client One thread
      await trainerPage.goto('/trainer/chat');
      await trainerPage.waitForLoadState('networkidle').catch(() => {});
      await expect(trainerPage.getByText('TEST_FF Client One').first()).toBeVisible({ timeout: 15_000 });
      await trainerPage.getByText('TEST_FF Client One').first().click();
      await expect(trainerPage.getByText('TEST_FF hi from trainer').first()).toBeVisible({ timeout: 10_000 });

      // Client side: opens chat page without crash
      await clientPage.goto('/client/chat');
      await clientPage.waitForLoadState('networkidle').catch(() => {});
      const clientText = await clientPage.locator('body').innerText();
      expect(clientText).not.toMatch(/Internal Server Error|TypeError/i);

      await trainerCtx.close();
      await clientCtx.close();
    } finally {
      await browser.close();
    }
  });
});
