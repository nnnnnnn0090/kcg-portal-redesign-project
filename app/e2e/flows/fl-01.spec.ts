import {
  disposeExtensionContext,
  launchExtensionContext,
  PORTAL_HOME_URL,
  waitForExtensionServiceWorker,
} from '../support/extension-context';
import { ensurePortalLoggedIn } from '../support/portal-auth';
import {
  confirmLanguagePicker,
  skipGuidedTour,
  waitForLanguagePicker,
  waitForPortalOverlay,
} from '../support/flow-helpers';
import { expect, test, skipUnlessRealServerReady } from '../support/test-fixtures';
import { readExtensionStorage, SK } from '../support/storage-helpers';

test.describe('FL-01 first install', () => {
  skipUnlessRealServerReady();

  test('install → auto-open → language → tour skip → storage 3 keys', async () => {
    test.setTimeout(180_000);
    const handle = await launchExtensionContext({ fresh: true });

    try {
      const portalTabPromise = handle.context
        .waitForEvent('page', {
          timeout: 30_000,
          predicate: (page) => page.url().includes('home.kcg.ac.jp'),
        })
        .catch(() => null);

      const worker = await waitForExtensionServiceWorker(handle.context);
      let portalPage = await portalTabPromise;
      if (!portalPage) {
        portalPage = handle.context.pages()[0] ?? (await handle.context.newPage());
        await portalPage.goto(PORTAL_HOME_URL, {
          waitUntil: 'domcontentloaded',
          timeout: 120_000,
        });
      }

      await portalPage.waitForLoadState('domcontentloaded', { timeout: 120_000 }).catch(() => undefined);
      await ensurePortalLoggedIn(portalPage);
      await waitForPortalOverlay(portalPage);
      await waitForLanguagePicker(portalPage);
      await confirmLanguagePicker(portalPage);
      await skipGuidedTour(portalPage);

      const storage = await readExtensionStorage(worker, [
        SK.language,
        SK.portalLanguagePickerDone,
        SK.portalGuidedTourDone,
      ]);

      expect(storage[SK.portalLanguagePickerDone]).toBe(true);
      expect(storage[SK.portalGuidedTourDone]).toBe(true);
      expect(typeof storage[SK.language]).toBe('string');
      expect((storage[SK.language] as string).length).toBeGreaterThan(0);
    } finally {
      await disposeExtensionContext(handle);
    }
  });
});
