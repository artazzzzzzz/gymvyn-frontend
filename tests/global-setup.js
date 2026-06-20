// @ts-check
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { USERS, PASSWORD } from './helpers/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, '.auth');

export default async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const [key, user] of Object.entries(USERS)) {
      const file = path.join(AUTH_DIR, `${key}.json`);
      if (fs.existsSync(file)) {
        const age = Date.now() - fs.statSync(file).mtimeMs;
        if (age < 30 * 60 * 1000) continue; // cache 30min
      }
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await page.goto('http://localhost:5174/login');
      await page.getByPlaceholder('Email address').fill(user.email);
      await page.getByPlaceholder('Password').fill(PASSWORD);
      await page.getByRole('button', { name: /Sign in/ }).click();
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
      await ctx.storageState({ path: file });
      await ctx.close();
      console.log(`  cached auth: ${key}`);
    }
  } finally {
    await browser.close();
  }
}
