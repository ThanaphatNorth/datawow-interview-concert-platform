import { test, expect } from '@playwright/test';
import { ApiClient, SEED_ADMIN, uid } from './helpers/api';
import { uiLogin } from './helpers/ui';
import { concertCard, deleteBtn } from './helpers/concerts';

/**
 * User story: admin create + delete a concert.
 * Success criteria:
 *  - Admin logs in -> /admin.
 *  - Create tab: fill the form, Save -> success toast, concert appears in Overview.
 *  - Delete: confirm dialog shows the concert name -> confirm -> removed + success toast.
 */
test.describe('admin CRUD', () => {
  let api: ApiClient;

  test.beforeAll(async () => {
    api = await ApiClient.create();
  });
  test.afterAll(async () => {
    await api.dispose();
  });

  test('admin creates then deletes a concert via the UI', async ({ page }) => {
    const name = `E2E CRUD ${uid()}`;

    await uiLogin(page, SEED_ADMIN);
    await expect(page).toHaveURL(/\/admin/);

    // --- Create ---
    await page.getByTestId('tab-create').click();
    await expect(page.getByTestId('concert-form')).toBeVisible();
    await page.getByTestId('concert-name-input').fill(name);
    await page.getByTestId('concert-seats-input').fill('25');
    await page.getByTestId('concert-description-input').fill('Created by E2E CRUD spec');
    await page.getByTestId('concert-save-btn').click();

    // Success toast (class selector is the one allowed non-testid selector).
    // Scope by text — a login "Welcome back" toast can still be on screen.
    await expect(
      page.locator('.fct-toast-success').filter({ hasText: 'Create successfully' }),
    ).toBeVisible();

    // Returns to Overview; the new concert card is present.
    await expect(page.getByTestId('tab-overview')).toHaveAttribute('aria-current', 'page');
    const newCard = page
      .getByTestId('concert-card')
      .filter({ has: page.getByTestId('concert-title').filter({ hasText: name }) });
    await expect(newCard).toHaveCount(1);

    // Resolve the concert id from the API so deletion is scoped precisely.
    const adminToken = await api.adminToken();
    const created = (await api.listConcerts(adminToken)).find((c) => c.name === name);
    expect(created, 'created concert present in API').toBeTruthy();

    // --- Delete ---
    await deleteBtn(page, created!.id).click();
    await expect(page.getByTestId('delete-dialog')).toBeVisible();
    await expect(page.getByTestId('delete-dialog-name')).toContainText(name);
    await page.getByTestId('delete-confirm-btn').click();

    await expect(
      page.locator('.fct-toast-success').filter({ hasText: 'Delete successfully' }),
    ).toBeVisible();
    await expect(concertCard(page, created!.id)).toHaveCount(0);
  });
});
