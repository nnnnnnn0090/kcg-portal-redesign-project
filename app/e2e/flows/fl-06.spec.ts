import { openPortalHome } from '../support/flow-helpers';
import {
  ensureKingLmsCalendarPage,
  postKingLmsAssignmentDue,
} from '../support/king-lms-helpers';
import { readExtensionStorage, SK } from '../support/storage-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-06 assignment sync', () => {
  skipUnlessRealServerReady();

  test('refresh assignments → storage + toast + hash cleared', async ({ extensionHandle, worker }) => {
    test.setTimeout(180_000);
    const { page } = await openPortalHome(extensionHandle.context, { skipOnboarding: true });
    await expect(page.locator('#p-assignment-refresh-btn')).toBeVisible({ timeout: 30_000 });
    await page.locator('#p-assignment-refresh-btn').click();

    await page.waitForURL(/king-lms\.kcg\.edu/, { timeout: 120_000 });
    await ensureKingLmsCalendarPage(page);
    await postKingLmsAssignmentDue(page);

    await page.waitForURL(/home\.kcg\.ac\.jp\/portal/, { timeout: 120_000 });
    expect(page.url()).not.toContain('#portal-king-lms-assignment-sync-timeout');
    await expect(page.locator('#p-toast')).toBeVisible({ timeout: 30_000 });

    const storage = await readExtensionStorage(worker, [
      SK.kingLmsAssignmentDue,
      SK.kingLmsAssignmentSyncPending,
      SK.kingLmsAssignmentSyncReturnUrl,
    ]);
    const due = storage[SK.kingLmsAssignmentDue] as { items?: unknown[] } | undefined;
    expect(Array.isArray(due?.items)).toBe(true);
    expect((due?.items ?? []).length).toBeGreaterThan(0);
    expect(storage[SK.kingLmsAssignmentSyncPending]).toBe(false);
    expect(storage[SK.kingLmsAssignmentSyncReturnUrl]).toBe('');
  });
});
