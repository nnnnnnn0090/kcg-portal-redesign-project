import { openPortalHome, openSettingsPanel } from '../support/flow-helpers';
import {
  ensureKingLmsCoursePage,
  postKingLmsCourses,
  waitForPortalReturnAfterKingLmsSync,
} from '../support/king-lms-helpers';
import { readExtensionStorage, SK } from '../support/storage-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-04 King LMS course sync', () => {
  skipUnlessRealServerReady();

  test('resync courses → storage + toast + hash cleared', async ({ extensionHandle, worker }) => {
    test.setTimeout(180_000);
    const { page } = await openPortalHome(extensionHandle.context, { skipOnboarding: true });
    await openSettingsPanel(page);
    await page.getByRole('tab', { name: /連携|Connections/i }).click();
    await page.getByRole('button', { name: /コース一覧を再取得|Resync courses/i }).click();

    await page.waitForURL(/king-lms\.kcg\.edu/, { timeout: 120_000 });
    await ensureKingLmsCoursePage(page);
    await postKingLmsCourses(page);

    await waitForPortalReturnAfterKingLmsSync(page, worker);
    expect(page.url()).not.toContain('#portal-king-lms-sync-timeout');

    const storage = await readExtensionStorage(worker, [
      SK.kingLmsCourses,
      SK.kingLmsSyncPending,
      SK.kingLmsSyncReturnUrl,
    ]);
    expect(Array.isArray(storage[SK.kingLmsCourses])).toBe(true);
    expect((storage[SK.kingLmsCourses] as unknown[]).length).toBeGreaterThan(0);
    expect(storage[SK.kingLmsSyncPending]).toBe(false);
    expect(storage[SK.kingLmsSyncReturnUrl]).toBe('');
  });
});
