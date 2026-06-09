import { Page, expect } from '@playwright/test';
import { AuthResult } from './api';

const TOKEN_KEY = 'fct_token';
const USER_KEY = 'fct_user';

/**
 * Log in through the real UI using only testids (exercises the login flow).
 * After submit, the app redirects away from /login — we await that.
 */
export async function uiLogin(page: Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(creds.email);
  await page.getByTestId('login-password').fill(creds.password);
  await page.getByTestId('login-submit').click();
  await expect(page).not.toHaveURL(/\/login/);
}

/**
 * Fast-path session injection for specs where login itself is NOT under test.
 * Seeds the same localStorage keys the app uses, then loads the target route.
 * Avoids re-driving the login form on every spec while staying deterministic.
 */
export async function seedSession(page: Page, auth: AuthResult, gotoPath = '/concerts') {
  // localStorage must be set against the app origin, so visit first.
  await page.goto('/login');
  await page.evaluate(
    ({ token, user, tokenKey, userKey }) => {
      window.localStorage.setItem(tokenKey, token);
      window.localStorage.setItem(userKey, JSON.stringify(user));
    },
    { token: auth.accessToken, user: auth.user, tokenKey: TOKEN_KEY, userKey: USER_KEY },
  );
  await page.goto(gotoPath);
}
