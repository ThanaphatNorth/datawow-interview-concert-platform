import { Locator, Page } from '@playwright/test';

/**
 * Locate a specific concert's card by its concert id.
 * The card exposes data-concert-id, which lets us scope per-card testids
 * (reserve/cancel/soldout/delete) without selecting by visible text.
 */
export function concertCard(page: Page, concertId: string): Locator {
  return page.locator(`[data-testid="concert-card"][data-concert-id="${concertId}"]`);
}

export function reserveBtn(page: Page, concertId: string): Locator {
  return concertCard(page, concertId).getByTestId('concert-reserve-btn');
}

export function cancelBtn(page: Page, concertId: string): Locator {
  return concertCard(page, concertId).getByTestId('concert-cancel-btn');
}

export function soldOutBadge(page: Page, concertId: string): Locator {
  return concertCard(page, concertId).getByTestId('concert-soldout-badge');
}

export function deleteBtn(page: Page, concertId: string): Locator {
  return concertCard(page, concertId).getByTestId('concert-delete-btn');
}
