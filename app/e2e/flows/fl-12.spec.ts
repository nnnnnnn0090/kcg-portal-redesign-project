import path from 'node:path';
import { openPortalHome } from '../support/flow-helpers';
import { openCommunityActivity } from '../support/real-server-helpers';
import {
  acceptCommunityConsentIfShown,
  communityCredentialsReady,
  loginCommunityIfNeeded,
} from '../support/community-auth';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-12 report flow', () => {
  skipUnlessRealServerReady();

  test('post report → alert confirmation', async ({ extensionHandle }) => {
    test.skip(!communityCredentialsReady(), 'COMMUNITY_E2E_LOGIN_ID / COMMUNITY_E2E_PASSWORD required');
    test.setTimeout(180_000);
    const { page } = await openPortalHome(extensionHandle.context, { skipOnboarding: true });
    await openCommunityActivity(page);
    await acceptCommunityConsentIfShown(page);
    await loginCommunityIfNeeded(page);
    await expect(page.locator('#p-community-activity-drawer')).toBeVisible({ timeout: 60_000 });

    const drawer = page.locator('#p-community-activity-drawer');
    await drawer.getByRole('button', { name: /見つける|Explore/ }).click();
    const firstPost = drawer.locator('article.community-post').first();
    await expect(firstPost).toBeVisible({ timeout: 60_000 });

    const dialogPromise = page.waitForEvent('dialog', { timeout: 60_000 });
    await firstPost.click();

    const postDialog = page.locator('article.community-post-dialog');
    await expect(postDialog).toBeVisible({ timeout: 60_000 });
    await postDialog.getByRole('button', { name: /^通報$|^Report$/ }).click();

    const reportTextarea = page.locator('.community-report-form textarea');
    await reportTextarea.fill('Inappropriate content for E2E.');
    const reportSubmit = page.locator('.community-report-form button', { hasText: /送信|Submit/ });
    await expect(reportSubmit).toBeEnabled({ timeout: 10_000 });
    await reportSubmit.click();

    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('通報を送信しました');
    await dialog.accept();
  });
});
