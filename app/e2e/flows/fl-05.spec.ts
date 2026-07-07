import { PORTAL_HOME_URL } from '../support/flow-helpers';
import { acquireTestPage } from '../support/shared-extension';
import {
  ensureKingLmsCoursePage,
  postKingLmsCourses,
  simulateKingLmsLoginInterrupt,
  waitForPortalReturnAfterKingLmsSync,
} from '../support/king-lms-helpers';
import { readExtensionStorage, SK, writeExtensionStorage } from '../support/storage-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';

test.describe('FL-05 sync login interrupt', () => {
  skipUnlessRealServerReady();

  test('login redirect → await flag → resume sync', async ({ extensionHandle, worker }) => {
    test.setTimeout(180_000);
    await writeExtensionStorage(worker, {
      [SK.kingLmsSyncPending]: true,
      [SK.kingLmsSyncReturnUrl]: PORTAL_HOME_URL,
      [SK.kingLmsSyncAwaitCourse]: false,
    });

    const page = await acquireTestPage(extensionHandle.context);
    await simulateKingLmsLoginInterrupt(page, worker);

    let storage = await readExtensionStorage(worker, [
      SK.kingLmsSyncAwaitCourse,
      SK.kingLmsSyncPending,
      SK.kingLmsSyncReturnUrl,
    ]);
    expect(storage[SK.kingLmsSyncAwaitCourse]).toBe(true);
    expect(storage[SK.kingLmsSyncPending]).toBe(false);
    expect(String(storage[SK.kingLmsSyncReturnUrl] ?? '')).toContain('home.kcg.ac.jp/portal');

    await ensureKingLmsCoursePage(page);
    await page.waitForTimeout(1_000);
    await postKingLmsCourses(page);
    await waitForPortalReturnAfterKingLmsSync(page, worker);

    storage = await readExtensionStorage(worker, [SK.kingLmsCourses, SK.kingLmsSyncPending]);
    expect(Array.isArray(storage[SK.kingLmsCourses])).toBe(true);
    expect((storage[SK.kingLmsCourses] as unknown[]).length).toBeGreaterThan(0);
    expect(storage[SK.kingLmsSyncPending]).toBe(false);
  });
});
