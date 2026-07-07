import { test as base, expect } from '@playwright/test';
import type { Page, Worker } from '@playwright/test';
import {
  disposeExtensionContext,
  extensionBuildReady,
  launchExtensionContext,
  waitForExtensionServiceWorker,
  type ExtensionContextHandle,
} from './extension-context';
import { ensurePortalLoggedIn, saveAuthState, seedPortalStorageForTests } from './portal-auth';
import { acquireTestPage, realServerReady } from './shared-extension';
import { seedOnboardingDone } from './flow-helpers';
import { installCommunityAccessStub, installCommunityApiProxy } from './real-server-helpers';
import { installKingLmsLoginRedirectStub } from './king-lms-helpers';

export { expect };

type WorkerFixtures = {
  extensionWorker: ExtensionContextHandle;
};

export const test = base.extend<{
  extensionHandle: ExtensionContextHandle;
  page: Page;
  worker: Worker;
}, WorkerFixtures>({
  extensionWorker: [
    async ({}, use) => {
      const handle = await launchExtensionContext();
      await installCommunityAccessStub(handle.context);
      await installCommunityApiProxy(handle.context);
      await installKingLmsLoginRedirectStub(handle.context);
      const worker = await waitForExtensionServiceWorker(handle.context);
      await seedOnboardingDone(worker);
      await seedPortalStorageForTests(handle.context);
      const page = await acquireTestPage(handle.context);
      await ensurePortalLoggedIn(page);
      await saveAuthState(handle.context);
      await use(handle);
      await disposeExtensionContext(handle);
    },
    { scope: 'worker' },
  ],
  extensionHandle: async ({ extensionWorker }, use) => {
    await use(extensionWorker);
  },
  page: async ({ extensionHandle }, use) => {
    const page = await acquireTestPage(extensionHandle.context);
    await use(page);
  },
  worker: async ({ extensionHandle }, use) => {
    const worker = await waitForExtensionServiceWorker(extensionHandle.context);
    await use(worker);
  },
});

export function skipUnlessRealServerReady(): void {
  test.skip(!extensionBuildReady(), 'extension build missing — run npm run build first');
  test.skip(!realServerReady(), 'PORTAL_MS_EMAIL / PORTAL_MS_PASSWORD required for real-server E2E');
}
