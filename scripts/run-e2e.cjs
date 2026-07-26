'use strict';

// One-command bring-up for the Playwright E2E suite (GAPS.md item 3).
//
// Previously running `npx playwright test` required a human to manually:
//   1. start the backend (cd ../gymvyn-backend && npm run dev)
//   2. seed the TEST_FF_* fixture accounts (node scripts/seed-test-ecosystem.js)
//   3. start this frontend on the port Playwright expects (PORT=5174 npm run dev)
// before Playwright's own globalSetup (tests/global-setup.js) could even log in.
//
// This script does all three, waits for both servers to be healthy, seeds
// fixtures, runs Playwright, and tears down only what IT started -- if a
// backend or frontend dev server is already running on the expected port
// when this script starts, it's left alone (and not killed on exit), so
// this is also safe to run alongside a normal `npm run dev` session.

const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_ROOT = path.resolve(ROOT, '..', 'gymvyn-backend');
const BACKEND_PORT = process.env.PORT_BACKEND || 3000;
const FRONTEND_PORT = 5174;
const BACKEND_BASE = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_BASE = `http://localhost:${FRONTEND_PORT}`;

function fail(message) {
  console.error(`run-e2e: ${message}`);
  process.exit(1);
}

async function isUp(url) {
  try { return (await fetch(url)).ok; } catch { return false; }
}

async function waitUntilUp(url, label, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail(`${label} did not become ready at ${url} within ${timeoutMs}ms`);
}

async function main() {
  if (!fs.existsSync(BACKEND_ROOT)) {
    fail(`expected sibling repo at ${BACKEND_ROOT} -- clone gymvyn-backend next to this repo`);
  }
  if (!fs.existsSync(path.join(BACKEND_ROOT, '.env'))) {
    fail(`${BACKEND_ROOT}/.env is missing -- the backend needs SUPABASE_URL/SUPABASE_SERVICE_KEY to seed and serve`);
  }

  const started = { backend: null, frontend: null };

  try {
    // ── Backend ────────────────────────────────────────────────────────────
    if (await isUp(`${BACKEND_BASE}/health`)) {
      console.log(`run-e2e: backend already running at ${BACKEND_BASE}, reusing it`);
    } else {
      console.log(`run-e2e: starting backend on :${BACKEND_PORT}...`);
      started.backend = spawn('node', ['server.js'], {
        cwd: BACKEND_ROOT,
        env: { ...process.env, PORT: String(BACKEND_PORT) },
        stdio: 'inherit',
      });
      // If the backend crashes on startup, waitUntilUp's own 30s timeout
      // (not this listener) is what surfaces the failure -- keeping cleanup
      // on the single try/finally path below rather than a second exit path
      // that could call process.exit() and skip it.
      await waitUntilUp(`${BACKEND_BASE}/health`, 'backend', 30_000);
    }

    // ── Seed fixtures ──────────────────────────────────────────────────────
    console.log('run-e2e: seeding TEST_FF_* fixture accounts...');
    const seed = spawnSync('node', ['scripts/seed-test-ecosystem.js'], {
      cwd: BACKEND_ROOT,
      stdio: 'inherit',
    });
    if (seed.status !== 0) fail('seed-test-ecosystem.js failed -- see output above');

    // ── Frontend ───────────────────────────────────────────────────────────
    if (await isUp(FRONTEND_BASE)) {
      console.log(`run-e2e: frontend already running at ${FRONTEND_BASE}, reusing it`);
    } else {
      console.log(`run-e2e: starting frontend on :${FRONTEND_PORT}...`);
      started.frontend = spawn('npm', ['run', 'dev'], {
        cwd: ROOT,
        env: { ...process.env, PORT: String(FRONTEND_PORT) },
        stdio: 'inherit',
      });
      await waitUntilUp(FRONTEND_BASE, 'frontend', 30_000);
    }

    // ── Playwright ─────────────────────────────────────────────────────────
    console.log('run-e2e: running Playwright...');
    const extraArgs = process.argv.slice(2);
    const pw = spawnSync('npx', ['playwright', 'test', ...extraArgs], { cwd: ROOT, stdio: 'inherit' });
    process.exitCode = pw.status ?? 1;
  } finally {
    if (started.frontend) started.frontend.kill('SIGTERM');
    if (started.backend) started.backend.kill('SIGTERM');
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
