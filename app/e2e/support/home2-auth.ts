import type { Page } from '@playwright/test';

export function home2Credentials(): { loginId: string; password: string } | null {
  const loginId =
    process.env.HOME2_E2E_LOGIN_ID?.trim()
    ?? process.env.PORTAL_MS_EMAIL?.trim()?.split('@')[0]
    ?? '';
  const password =
    process.env.HOME2_E2E_PASSWORD?.trim()
    ?? process.env.PORTAL_MS_PASSWORD?.trim()
    ?? '';
  if (!loginId || !password) return null;
  return { loginId, password };
}

/** Sign in to Home2 WebMail when the host page shows the native login form. */
export async function ensureHome2MailLoggedIn(page: Page): Promise<void> {
  if (await page.locator('#p-home2-mail-send').isVisible({ timeout: 3_000 }).catch(() => false)) {
    return;
  }

  const creds = home2Credentials();
  if (!creds) {
    throw new Error(
      'HOME2_E2E_LOGIN_ID / HOME2_E2E_PASSWORD (or PORTAL_MS_*) required for Home2 mail E2E',
    );
  }

  const overlayLogin = page.locator('#p-home2-mail-login');
  if (await overlayLogin.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await overlayLogin.locator('input[type="text"], input[name="loginId"]').first().fill(creds.loginId);
    await overlayLogin.locator('input[type="password"]').first().fill(creds.password);
    await overlayLogin.getByRole('button', { name: /ログイン|Login/i }).click();
    return;
  }

  const userField = page.getByRole('textbox', { name: /ユーザー\s*ID/i }).first();
  if (await userField.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await userField.fill(creds.loginId);
    await page.getByRole('textbox', { name: /^パスワード$/i }).first().fill(creds.password);
    await page.getByRole('button', { name: /^ログイン$|^Login$/i }).first().click();
    await page.waitForLoadState('domcontentloaded');
  }
}
