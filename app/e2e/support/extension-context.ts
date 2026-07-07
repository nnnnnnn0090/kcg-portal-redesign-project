import type { BrowserContext, Worker } from '@playwright/test';
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AUTH_PROFILE_DIR } from './portal-auth';

export const EXTENSION_PATH = path.join(process.cwd(), '.output/chrome-mv3');
export const PORTAL_HOME_URL = 'https://home.kcg.ac.jp/portal/';

export function extensionBuildReady(): boolean {
  return fs.existsSync(path.join(EXTENSION_PATH, 'manifest.json'));
}

export interface ExtensionContextHandle {
  context: BrowserContext;
  userDataDir: string;
  disposeProfile?: boolean;
}

export async function launchExtensionContext(options?: {
  fresh?: boolean;
}): Promise<ExtensionContextHandle> {
  const fresh = options?.fresh ?? false;
  const userDataDir = fresh
    ? fs.mkdtempSync(path.join(os.tmpdir(), 'kcg-portal-fresh-'))
    : AUTH_PROFILE_DIR;

  if (!fresh) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  return { context, userDataDir, disposeProfile: fresh };
}

export async function waitForExtensionServiceWorker(context: BrowserContext): Promise<Worker> {
  const existing = context.serviceWorkers()[0];
  if (existing) return existing;

  const page = context.pages()[0] ?? (await context.newPage());
  const swPromise = context.waitForEvent('serviceworker', { timeout: 30_000 });
  await page.goto('about:blank');
  return context.serviceWorkers()[0] ?? (await swPromise);
}

export function extensionIdFromWorker(worker: Worker): string {
  const match = worker.url().match(/^chrome-extension:\/\/([^/]+)\//);
  if (!match?.[1]) {
    throw new Error(`Could not parse extension id from worker url: ${worker.url()}`);
  }
  return match[1];
}

export async function disposeExtensionContext(handle: ExtensionContextHandle): Promise<void> {
  await handle.context.close();
  if (handle.disposeProfile) {
    fs.rmSync(handle.userDataDir, { recursive: true, force: true });
  }
}
