import path from 'node:path';
import { communityFrame } from '../support/community-frame';
import { openCommunityDrawer } from '../support/community-auth';
import { openPortalHome } from '../support/flow-helpers';
import { readExtensionStorage, SK, writeExtensionStorage } from '../support/storage-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

const TINY_PNG_PATH = path.join(process.cwd(), 'e2e/assets/tiny.png');

test.describe('FL-11 community first post', () => {
  skipUnlessRealServerReady();

  test('consent → register → submit post → sent modal', async ({ extensionHandle, worker }) => {
    test.setTimeout(180_000);
    const loginId = `e2e-${Date.now().toString(36)}`;
    await writeExtensionStorage(worker, {
      [SK.communityDisclaimerAccepted]: false,
      [SK.language]: 'ja',
    });

    const { page } = await openPortalHome(extensionHandle.context, { skipOnboarding: true });
    await openCommunityDrawer(page);

    const frame = communityFrame(page);
    await frame.locator('.community-home-heading button').click();
    const authForm = frame.locator('form.community-auth');
    await expect(authForm).toBeVisible({ timeout: 30_000 });
    await authForm.getByRole('tab', { name: /新規登録|Sign up/ }).click();
    await authForm.locator('input[name="displayName"]').fill('E2E User');
    await authForm.locator('input[name="communityLoginId"]').fill(loginId);
    await authForm.locator('input[name="communitySecret"]').fill('password12345');
    await authForm.locator('input[name="communitySecretConfirmation"]').fill('password12345');
    await authForm.getByRole('button', { name: /アカウントを作成|Create account/ }).click();

    await expect(authForm).toHaveCount(0, { timeout: 60_000 });
    await expect(frame.getByRole('button', { name: /ログアウト|Log out/ })).toBeVisible({
      timeout: 60_000,
    });

    await frame.locator('.community-home-heading button').click();
    const createForm = frame.locator('form.community-create-dialog');
    await expect(createForm).toBeVisible({ timeout: 60_000 });
    await frame.locator('#community-post-images').setInputFiles(TINY_PNG_PATH);
    await expect(frame.locator('.community-composer-stage.has-image')).toBeVisible({
      timeout: 30_000,
    });
    await createForm.locator('input[name="title"]').fill('E2E title');
    await createForm.locator('textarea[name="caption"]').fill('E2E community post');
    await createForm.getByRole('button', { name: /審査へ送信|Submit/ }).click();

    await expect(frame.locator('.community-sent h2')).toContainText(/投稿を受け付けました|Post submitted/, {
      timeout: 60_000,
    });

    const storage = await readExtensionStorage(worker, [SK.communityDisclaimerAccepted]);
    expect(storage[SK.communityDisclaimerAccepted]).toBe(true);
  });
});
