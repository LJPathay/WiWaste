import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page } from '@playwright/test';

/**
 * E2E accounts. These mirror `Backend/database/seeders/DatabaseSeeder.php::seedUsers()`,
 * which is re-run by `e2e/global-setup.ts` before every suite. Do not invent usernames
 * here — if a role is missing, fix the seeder.
 */
export const CREDENTIALS = {
  owner: { username: 'admin', password: 'admin123' },
  inventory: { username: 'inventory', password: 'inventory123' },
  cashier: { username: 'cashier', password: 'cashier123' },
} as const;

export type Role = keyof typeof CREDENTIALS;

/**
 * Where `pages/Login.tsx` sends you after a successful sign-in:
 * cashiers go to the POS kiosk, everyone else to the role-aware dashboard.
 */
export const LANDING_URL: Record<Role, RegExp> = {
  owner: /\/dashboard$/,
  inventory: /\/dashboard$/,
  cashier: /\/cashier\/pos$/,
};

/** The path each role's `LANDING_URL` pattern matches. */
export const LANDING_PATH: Record<Role, string> = {
  owner: '/dashboard',
  inventory: '/dashboard',
  cashier: '/cashier/pos',
};

/**
 * Pages are lazy-loaded and fan out to several API calls, so give them room.
 * Kept out of `expect.timeout` because it would mask genuinely slow pages.
 */
export const RENDER_TIMEOUT = 45_000;

/** The element `DashboardLayout` renders the routed page into. */
export const MAIN = '#main-content';

/**
 * Waits for a routed page to actually paint.
 *
 * Waiting on the shell alone is not enough: `PageLoader` immediately puts a
 * "Loading..." spinner inside `#main-content`, so a naive child-count check passes
 * while the page is still blank. Every route also renders a heading once its data
 * arrives, so poll on that instead.
 */
export async function waitForPage(page: Page, root: string = MAIN): Promise<void> {
  const scope = page.locator(root);

  await expect(
    scope.locator('h1, h2, h3').first(),
    'page never rendered a heading',
  ).toBeVisible({ timeout: RENDER_TIMEOUT });
}

/** Where `useAuth` keeps its state — everything needed to skip the login form. */
const SESSION_KEYS = ['wiwaste-session', 'wiwaste_token', 'wiwaste_user'] as const;

const cacheDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.auth-cache');
const cacheFile = (role: Role) => path.join(cacheDir, `${role}.json`);

/**
 * Signs in, reusing a session captured earlier in this run.
 *
 * `RateLimitMiddleware` allows 10 sign-ins per IP per 15 minutes, which a suite with
 * one `beforeEach` per test blows through — the tail of the run just gets bounced back
 * to `/login`. The suite only needs three accounts, so the first sign-in for a role is
 * captured to disk and replayed for the rest of the run.
 *
 * `globalSetup` deletes the cache before seeding, because `migrate:fresh` drops
 * `personal_access_tokens` and would otherwise leave us replaying a dead token.
 *
 * `fresh: true` bypasses the cache for tests that assert on the login form or on what
 * happens after a session ends — the replayed state is re-applied on every navigation,
 * which would resurrect a session the test just cleared.
 */
export async function login(
  page: Page,
  role: Role,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<void> {
  const cached =
    !fresh && existsSync(cacheFile(role))
      ? (JSON.parse(readFileSync(cacheFile(role), 'utf8')) as Record<string, string>)
      : null;

  if (cached) {
    await page.addInitScript((entries: [string, string][]) => {
      for (const [key, value] of entries) window.localStorage.setItem(key, value);
    }, SESSION_KEYS.map((key) => [key, cached[key] ?? '']));

    await page.goto(LANDING_PATH[role]);
    await waitForPage(page);
    return;
  }

  const { username, password } = CREDENTIALS[role];

  await page.goto('/login');
  await page.fill('#email', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(LANDING_URL[role]);
  await waitForPage(page);

  // Never publish a `fresh` session. A fresh sign-in exists so a test can assert on the
  // login form and on sign-out — and the sign-out revokes this very token server-side.
  // Caching it left every later spec replaying a revoked token, which bounced them all
  // back to /login. It only ever surfaced in a full run, where the logout test in
  // `e2e/auth/login.spec.ts` precedes the owner specs.
  if (fresh) return;

  const stored = await page.evaluate(
    (keys: string[]) =>
      Object.fromEntries(keys.map((k) => [k, window.localStorage.getItem(k) ?? ''])),
    [...SESSION_KEYS],
  );

  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cacheFile(role), JSON.stringify(stored), 'utf8');
}

/** Signs in, then opens an authenticated path and waits for it to paint. */
export async function loginAndGoTo(page: Page, role: Role, path: string): Promise<void> {
  await login(page, role);
  await page.goto(path);
  await waitForPage(page);
}

/** Signs out via the dashboard shell's control. */
export async function logout(page: Page): Promise<void> {
  await page.click('[aria-label="Sign out"]');
  await expect(page).toHaveURL(/\/$/);
}

/**
 * Fails the test if the page logged an unhandled error or made a failed API call.
 * Wired into specs that assert a screen rendered, so a blank page caused by an
 * exception cannot pass as "the selector was fine, the data was just missing".
 */
export function collectPageErrors(page: Page): () => string[] {
  const errors: string[] = [];

  page.on('pageerror', (e) => errors.push(`unhandled: ${e.message}`));
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() !== 'error') return;
    // A 401 on the mount-time session probe is expected before sign-in.
    if (text.includes('401') || text.includes('verifyToken')) return;
    errors.push(`console: ${text}`);
  });

  return () => errors;
}