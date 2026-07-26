// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // *.test.js files in this same directory are the separate `node --test`
  // suite (npm test) -- not Playwright specs. Without this, Playwright's
  // default testMatch (**/*.@(spec|test).?(c|m)js) also picks them up and
  // executes them as a side effect of collection.
  testIgnore: ['**/helpers/**', '**/global-setup.js', '**/.auth/**', '**/*.test.js'],
  globalSetup: './tests/global-setup.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5174',
    viewport: { width: 390, height: 844 },
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
  },
  outputDir: 'tests/playwright-output',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
  ],
});
