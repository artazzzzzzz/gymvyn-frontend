// @ts-check
import { expect } from '@playwright/test';

export const PASSWORD = 'TestFF!2026';

export const USERS = {
  owner_1:   { email: 'test_ff_owner_1@fitforge.test',   landing: '/gym/dashboard' },
  trainer_1: { email: 'test_ff_trainer_1@fitforge.test', landing: '/trainer/dashboard' },
  member_1:  { email: 'test_ff_member_1@fitforge.test',  landing: '/home' },
  member_3:  { email: 'test_ff_member_3@fitforge.test',  landing: '/home' },
  solo_1:    { email: 'test_ff_solo_1@fitforge.test',    landing: '/home' },
  client_1:  { email: 'test_ff_client_1@fitforge.test',  landing: '/home' },
};

/**
 * Drive the /login page as a given role. Returns once the post-login navigation
 * has settled (URL no longer /login). Throws if login fails.
 */
export async function loginAs(page, roleKey) {
  const user = USERS[roleKey];
  if (!user) throw new Error(`Unknown role: ${roleKey}`);
  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill(user.email);
  await page.getByPlaceholder('Password').fill(PASSWORD);
  // CTAButton renders "Sign in →" — match by substring
  await page.getByRole('button', { name: /Sign in/ }).click();
  // Wait for redirect off /login. Different roles land on different routes.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}
