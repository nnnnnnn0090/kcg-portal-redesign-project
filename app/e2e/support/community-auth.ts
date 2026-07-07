import { expect, type Page } from '@playwright/test';
import { waitForCommunityActivityEntry } from './real-server-helpers';

export function communityCredentialsReady(): boolean {
  return Boolean(
    process.env.COMMUNITY_E2E_LOGIN_ID?.trim() && process.env.COMMUNITY_E2E_PASSWORD?.trim(),
  );
}

export function communityCredentials(): { loginId: string; password: string } | null {
  const loginId = process.env.COMMUNITY_E2E_LOGIN_ID?.trim();
  const password = process.env.COMMUNITY_E2E_PASSWORD?.trim();
  if (!loginId || !password) return null;
  return { loginId, password };
}

export async function acceptCommunityConsentIfShown(page: Page): Promise<void> {
  const consent = page.locator('.p-community-consent');
  if (!(await consent.isVisible({ timeout: 15_000 }).catch(() => false))) return;

  const checkbox = consent.locator('.p-community-consent-check input[type="checkbox"]');
  await checkbox.check();
  const acceptButton = consent.getByRole('button', { name: /同意して開く|Agree and continue/ });
  await expect(acceptButton).toBeEnabled({ timeout: 5_000 });
  await acceptButton.click();
  await consent.waitFor({ state: 'hidden', timeout: 15_000 });
}

export async function loginCommunityIfNeeded(page: Page): Promise<void> {
  const creds = communityCredentials();
  if (!creds) return;

  const authForm = page.locator('form.community-auth');
  if (!(await authForm.isVisible({ timeout: 3_000 }).catch(() => false))) return;

  await authForm.getByRole('tab', { name: /ログイン|Log in|Sign in/ }).click();
  await authForm.locator('input[name="communityLoginId"]').fill(creds.loginId);
  await authForm.locator('input[name="communitySecret"]').fill(creds.password);
  await authForm.getByRole('button', { name: /ログイン|Log in|Sign in/ }).click();
  await authForm.waitFor({ state: 'hidden', timeout: 60_000 });
}

export async function openCommunityDrawer(page: Page): Promise<void> {
  await waitForCommunityActivityEntry(page);
  await page.locator('.p-community-activity-entry').click();
  await page
    .locator('.p-community-consent, #p-community-activity-drawer')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 });
  await acceptCommunityConsentIfShown(page);
  await loginCommunityIfNeeded(page);
  await page.locator('#p-community-activity-drawer').waitFor({ state: 'visible', timeout: 60_000 });
}
