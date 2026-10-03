import { test, expect, type Locator, type Page } from '@playwright/test';
import { login, waitForPage, MAIN, collectPageErrors } from '../helpers/auth';

/**
 * CRUD over `/owner/users` (`Frontend/src/pages/admin/ManageUsers.tsx`).
 *
 * Selectors are read off that file rather than guessed:
 *  - the row controls are icon-only, so they are addressed by the `aria-label` on
 *    each button (`Edit <name>` / `Archive <name>`),
 *  - the add form's inputs carry both a placeholder and an `id`,
 *  - the role picker is a custom dropdown — a button showing the current role plus a
 *    popover — not a `<select>`,
 *  - `generateUsername()` strips everything outside `[a-z\s]`, so a digit in a chosen
 *    name would silently vanish from the derived username.
 *
 * `globalSetup` seeds once per run, so tests share a database. Anything that mutates
 * a seeded row would leak into the next test, so each mutation here targets a user
 * the test creates itself.
 */

/** Letters only, so the derived username keeps every character that was typed. */
let seq = 0;
function name(prefix: string): string {
  seq += 1;
  const ordinal = [...seq.toString(26)].map((d) => String.fromCharCode(97 + Number(d, 26))).join('');
  const salt = Date.now().toString(36).replace(/[^a-z]/g, '').slice(0, 3).padEnd(3, 'x');
  return `${prefix}${ordinal}${salt}`.slice(0, 12);
}

const SEARCH = 'input[placeholder="Search name, username, email..."]';
const ROWS = `${MAIN} tbody tr`;

/**
 * Opens the add dialog and fills it in.
 *
 * The username is read back out of the form's "Auto-generated credentials" preview
 * rather than recomputed, so this spec never has to mirror `generateUsername()`.
 * The email is pre-filled from that same username but is a real, editable input, so a
 * caller can pass `email` to override it.
 */
async function fillAddDialog(
  page: Page,
  parts: { first: string; last: string; role?: string; contact?: string; email?: string },
): Promise<{ dialog: Locator; username: string }> {
  await page.getByRole('button', { name: 'Add User', exact: true }).click();

  const dialog = page.locator('[role="dialog"]').filter({ hasText: 'Add New User' });
  await expect(dialog).toBeVisible();

  await dialog.locator('input[placeholder="First"]').fill(parts.first);
  await dialog.locator('input[placeholder="Last"]').fill(parts.last);
  if (parts.contact) {
    await dialog.locator('input[placeholder="e.g. 09171234567"]').fill(parts.contact);
  }
  if (parts.email) {
    await dialog.locator('#add-user-email').fill(parts.email);
  }
  if (parts.role) {
    // The role control defaults to "Inventory Staff"; open it and choose otherwise.
    await dialog.getByRole('button').filter({ hasText: 'Inventory Staff' }).first().click();
    await dialog.getByRole('button').filter({ hasText: parts.role }).last().click();
  }

  await expect(dialog.getByText('Auto-generated credentials:')).toBeVisible();
  // The preview is a flex row, so `textContent` concatenates the label and value
  // spans with no separator ("…Username:@abcPassword:…"). The username is the run of
  // lowercase letters up to the next label.
  const preview = (await dialog.textContent()) ?? '';
  const username = preview.match(/Username:\s*@([a-z]+)/)?.[1];
  expect(username, `the add form did not preview a username: ${preview}`).toBeTruthy();

  return { dialog, username: `@${username}` };
}

/**
 * Opens an account's view dialog by clicking its row, and returns that dialog.
 *
 * The per-row Edit button was removed, so the row itself is the way in: clicking it
 * opens a read-only dialog whose footer carries Edit / Archive / Reactivate. The controls
 * that stay on the row (the archive button, the email unmask toggle) stop propagation,
 * so clicking the name cell avoids them.
 */
async function openViewDialog(page: Page, row: Locator): Promise<Locator> {
  await row.locator('td').first().click();
  const view = page.locator('[role="dialog"]').first();
  await expect(view).toBeVisible();
  return view;
}

/** Creates a user and waits for its row to appear. */
async function createUser(
  page: Page,
  parts: { first: string; last: string; role?: string },
): Promise<string> {
  const { dialog, username } = await fillAddDialog(page, parts);
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(page.locator(ROWS).filter({ hasText: username })).toBeVisible({ timeout: 20_000 });
  return username;
}

test.describe('Owner · User management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'owner');
    await page.goto('/owner/users');
    await waitForPage(page);
  });

  test('lists the seeded accounts', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Manage Users' })).toBeVisible();

    for (const username of ['@admin', '@inventory', '@cashier']) {
      await expect(page.getByText(username, { exact: true })).toBeVisible();
    }

    await expect(page.getByText(/\d+ Users$/)).toBeVisible();
  });

  test('creates a user and previews its generated credentials', async ({ page }) => {
    const errors = collectPageErrors(page);
    const first = name('E2e');
    const last = name('Create');

    const { dialog, username } = await fillAddDialog(page, {
      first,
      last,
      contact: '09171234567',
      role: 'Cashier',
    });

    // Username and password are derived and previewed before submitting. The email is
    // derived too, but it is an editable input, not part of the read-only preview.
    await expect(dialog.locator('#add-user-email')).toHaveValue(
      `${username.slice(1)}@wiwaste.com`,
    );
    await expect(dialog.getByText('WiWaste123!')).toBeVisible();

    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    const row = page.locator(ROWS).filter({ hasText: username });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row.getByText('Cashier')).toBeVisible();

    // Leave the seed as it was found.
    await row.getByRole('button', { name: `Archive ${first} ${last}` }).click();
    await page
      .locator('[role="dialog"]').filter({ hasText: 'Archive User Account' })
      .getByRole('button', { name: 'Archive User' }).click();
    await expect(row).toHaveCount(0, { timeout: 20_000 });

    expect(errors()).toEqual([]);
  });

  test('stores the email address typed into the form, not the derived one', async ({ page }) => {
    const errors = collectPageErrors(page);
    const first = name('E2e');
    const last = name('Mail');
    const email = `${name('reach')}-${Date.now().toString(36)}@ipharmamart.test`;

    const { dialog, username } = await fillAddDialog(page, { first, last, email });

    // The derived default is replaced as soon as it is typed into.
    await expect(dialog.locator('#add-user-email')).toHaveValue(email);

    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    const row = page.locator(ROWS).filter({ hasText: username });
    await expect(row).toBeVisible({ timeout: 20_000 });

    // The table masks addresses, so the stored one is read from the view dialog.
    await expect(row).not.toContainText(email);
    const view = await openViewDialog(page, row);
    await expect(view.getByText(email, { exact: true })).toBeVisible();
    await view.getByRole('button', { name: 'Close' }).click();
    await expect(view).toBeHidden({ timeout: 20_000 });

    await row.getByRole('button', { name: `Archive ${first} ${last}` }).click();
    await page
      .locator('[role="dialog"]').filter({ hasText: 'Archive User Account' })
      .getByRole('button', { name: 'Archive User' }).click();
    await expect(row).toHaveCount(0, { timeout: 20_000 });

    expect(errors()).toEqual([]);
  });

  test('blocks a duplicate name client-side', async ({ page }) => {
    // "Lia Cruz" is the seeded owner, and no test here renames them.
    const { dialog } = await fillAddDialog(page, { first: 'Lia', last: 'Cruz' });

    await expect(dialog.getByText('A user with this name already exists.')).toBeVisible();
    await expect(dialog.locator('button[type="submit"]')).toBeDisabled();
  });

  test('edits a user it created', async ({ page }) => {
    const errors = collectPageErrors(page);
    const first = name('E2e');
    const last = name('Edit');
    const renamed = name('Edited');

    const username = await createUser(page, { first, last });

    const view = await openViewDialog(page, page.locator(ROWS).filter({ hasText: username }));
    await view.getByRole('button', { name: 'Edit' }).click();

    const dialog = page.locator('[role="dialog"]').filter({ hasText: 'Edit User' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(username)).toBeVisible();

    // The stored email is carried into the form, so the owner account — which cannot
    // be created through this form — stays editable at all.
    await expect(dialog.locator('#edit-user-email')).toHaveValue(/@/);
    await dialog.locator('#edit-user-first-name').fill(renamed);
    await dialog.locator('#edit-user-contact-number').fill('09171234999');

    await dialog.locator('button[type="submit"]').click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    await expect(page.locator(ROWS).filter({ hasText: renamed })).toBeVisible({ timeout: 20_000 });
    expect(errors()).toEqual([]);
  });

  test('archives a user, then finds it under the Archived tab', async ({ page }) => {
    const errors = collectPageErrors(page);
    const first = name('E2e');
    const last = name('Archive');

    const username = await createUser(page, { first, last });

    const row = page.locator(ROWS).filter({ hasText: username });
    await row.getByRole('button', { name: `Archive ${first} ${last}` }).click();

    const confirm = page.locator('[role="dialog"]').filter({ hasText: 'Archive User Account' });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText(username)).toBeVisible();
    await confirm.getByRole('button', { name: 'Archive User' }).click();
    await expect(confirm).toBeHidden({ timeout: 20_000 });

    // Archived accounts drop out of the default "All Users" view…
    await expect(row).toHaveCount(0, { timeout: 20_000 });

    // …and are reachable through the Archived tab.
    await page.getByRole('button', { name: /^Archived/ }).click();
    const archived = page.locator(ROWS).filter({ hasText: username });
    await expect(archived).toBeVisible({ timeout: 20_000 });
    await expect(archived.getByText('Archived')).toBeVisible();

    expect(errors()).toEqual([]);
  });

  test('filters by role', async ({ page }) => {
    const errors = collectPageErrors(page);

    await page.locator('#user-role-filter').selectOption('Cashier');
    const rows = page.locator(ROWS);
    await expect(rows).toHaveCount(1);
    await expect(page.getByText('@cashier', { exact: true })).toBeVisible();

    await page.locator('#user-role-filter').selectOption('Owner');
    await expect(rows).toHaveCount(1);
    await expect(page.getByText('@admin', { exact: true })).toBeVisible();

    expect(errors()).toEqual([]);
  });

  test('searches and resets', async ({ page }) => {
    const errors = collectPageErrors(page);
    const rows = page.locator(ROWS);

    // Username match.
    await page.locator(SEARCH).fill('cashier');
    await expect(rows).toHaveCount(1);
    await expect(page.getByText('@cashier', { exact: true })).toBeVisible();

    // Surname match — the seeded inventory account's surname is never renamed.
    await page.locator(SEARCH).fill('Stockwell');
    await expect(rows).toHaveCount(1);
    await expect(page.getByText('@inventory', { exact: true })).toBeVisible();

    // Whole-name match. Every term is looked for across the name columns, so typing a
    // person's full name finds them; a single LIKE against each column returned nothing
    // for anything containing a space.
    await page.locator(SEARCH).fill('Lia Cruz');
    await expect(rows).toHaveCount(1);
    await expect(page.getByText('@admin', { exact: true })).toBeVisible();

    // Order does not matter, and a partial term still works.
    await page.locator(SEARCH).fill('cruz lia');
    await expect(rows).toHaveCount(1);
    await page.locator(SEARCH).fill('crz lia');
    await expect(rows).toHaveCount(1);

    // No match. DataTable renders its empty state in place of the rows, so the
    // summary line is the thing to assert.
    await page.locator(SEARCH).fill('zzzznosuchperson');
    await expect(page.getByText('No users match your filters')).toBeVisible();

    await page.getByRole('button', { name: 'Reset Filters' }).click();
    await expect(page.getByText('No users match your filters')).toBeHidden();
    await expect(rows.first()).toBeVisible();

    expect(errors()).toEqual([]);
  });
});