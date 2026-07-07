import type { BrowserContext, Page } from '@playwright/test';
import {
  disposeExtensionContext,
  launchExtensionContext,
  waitForExtensionServiceWorker,
  type ExtensionContextHandle,
} from './extension-context';
import { applySavedAuth, ensurePortalLoggedIn, saveAuthState, seedPortalStorageForTests } from './portal-auth';
import { seedOnboardingDone } from './flow-helpers';
import { logE2e } from './progress';
import { installCommunityAccessStub, installCommunityApiProxy } from './real-server-helpers';

let sharedHandle: ExtensionContextHandle | null = null;
let sharedReady = false;

export function realServerReady(): boolean {
  return Boolean(
    process.env.PORTAL_MS_EMAIL?.trim() && process.env.PORTAL_MS_PASSWORD?.trim(),
  );
}

export async function getSharedExtensionContext(): Promise<ExtensionContextHandle> {
  if (!sharedHandle) {
    logE2e('Launching extension browser…');
    sharedHandle = await launchExtensionContext();
    await installCommunityAccessStub(sharedHandle.context);
    await installCommunityApiProxy(sharedHandle.context);
    await applySavedAuth(sharedHandle.context);
  }
  if (!sharedReady) {
    logE2e('Preparing extension storage and portal login…');
    const worker = await waitForExtensionServiceWorker(sharedHandle.context);
    await seedOnboardingDone(worker);
    await seedPortalStorageForTests(sharedHandle.context);
    const page = await acquireTestPage(sharedHandle.context);
    await ensurePortalLoggedIn(page);
    await saveAuthState(sharedHandle.context);
    logE2e('Portal session ready');
    sharedReady = true;
  }
  return sharedHandle;
}

export async function acquireTestPage(context: BrowserContext): Promise<Page> {
  const pages = context.pages().filter((page) => !page.isClosed());
  const primary = pages[0] ?? (await context.newPage());
  for (const page of pages.slice(1)) {
    await page.close().catch(() => undefined);
  }
  return primary;
}

export async function disposeSharedExtensionContext(): Promise<void> {
  if (!sharedHandle) return;
  await disposeExtensionContext(sharedHandle);
  sharedHandle = null;
  sharedReady = false;
}
