import { test, expect } from '@playwright/test';
import { SEED_ADMIN } from './helpers/api';
import { uiLogin } from './helpers/ui';

/**
 * User story: concert form validation (client-side, inline).
 * Success criteria:
 *  - Empty name -> concert-name-input-error shown.
 *  - Seats <= 0 -> concert-seats-input-error shown.
 *  - No success toast appears (submit blocked).
 */
test.describe('concert form validation', () => {
  test('empty name and non-positive seats show inline errors', async ({ page }) => {
    await uiLogin(page, SEED_ADMIN);
    await expect(page).toHaveURL(/\/admin/);

    await page.getByTestId('tab-create').click();
    await expect(page.getByTestId('concert-form')).toBeVisible();

    // Leave name empty, set seats to 0, give a description, submit.
    await page.getByTestId('concert-seats-input').fill('0');
    await page.getByTestId('concert-description-input').fill('Some description');
    await page.getByTestId('concert-save-btn').click();

    await expect(page.getByTestId('concert-name-input-error')).toBeVisible();
    await expect(page.getByTestId('concert-seats-input-error')).toBeVisible();
    await expect(page.getByTestId('concert-seats-input-error')).toContainText(/> 0|positive/i);

    // Submission was blocked: no success toast.
    await expect(page.locator('.fct-toast-success')).toHaveCount(0);
  });
});
