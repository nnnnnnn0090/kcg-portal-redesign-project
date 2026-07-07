import fs from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page } from 'playwright';
import { SK } from './storage-helpers';
import { logE2e } from './progress';

export const PORTAL_ORIGIN = 'https://home.kcg.ac.jp';
export const PORTAL_HOME_URL = `${PORTAL_ORIGIN}/portal`;

export const AUTH_DIR = path.join(process.cwd(), 'e2e/.auth');
export const AUTH_STORAGE_PATH = path.join(AUTH_DIR, 'portal-storage.json');
export const AUTH_PROFILE_DIR = path.join(AUTH_DIR, 'chrome-profile');

export function portalCredentials(): { email: string; password: string } | null {
  const email = process.env.PORTAL_MS_EMAIL?.trim();
  const password = process.env.PORTAL_MS_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

export function portalCredentialsReady(): boolean {
  return portalCredentials() !== null;
}

export async function ensurePortalLoggedIn(page: Page): Promise<void> {
  if (await page.locator('#portal-overlay').isVisible({ timeout: 3_000 }).catch(() => false)) {
    logE2e('Portal already logged in (overlay visible)');
    return;
  }
  logE2e('Microsoft login required — signing in…');
  await loginMicrosoftPortal(page);
  logE2e('Microsoft login complete');
}

export function hasSavedAuth(): boolean {
  return fs.existsSync(AUTH_STORAGE_PATH);
}

export async function applySavedAuth(context: BrowserContext): Promise<void> {
  if (hasSavedAuth()) {
    await context.addCookies(
      JSON.parse(fs.readFileSync(AUTH_STORAGE_PATH, 'utf8')).cookies ?? [],
    );
  }
}

export async function saveAuthState(context: BrowserContext): Promise<void> {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await context.storageState({ path: AUTH_STORAGE_PATH });
}

/** Microsoft / KCG ログイン画面を通過してポータルホームへ到達する。 */
export async function loginMicrosoftPortal(page: Page): Promise<void> {
  const creds = portalCredentials();
  if (!creds) {
    throw new Error(
      'PORTAL_MS_EMAIL / PORTAL_MS_PASSWORD が未設定です（シェル環境変数のみ使用。リポジトリには保存しない）',
    );
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 120_000 }).catch(() => undefined);

  if (await page.locator('#portal-overlay').isVisible({ timeout: 3_000 }).catch(() => false)) {
    return;
  }

  if (!page.url().includes('home.kcg.ac.jp/portal')) {
    await gotoPortalHome(page);
  }

  if (await page.locator('#portal-overlay').isVisible({ timeout: 3_000 }).catch(() => false)) {
    return;
  }

  await tryClick(page, [
    'a[href*="Login"]',
    'a[href*="login"]',
    'button:has-text("ログイン")',
    'input[type="submit"][value*="ログイン"]',
  ]);

  await completeMicrosoftLogin(page, creds.email, creds.password);

  await page.waitForURL(/home\.kcg\.ac\.jp/i, { timeout: 120_000 }).catch(() => undefined);
  if (!page.url().includes('/portal')) {
    await gotoPortalHome(page);
  }

  await page.locator('#portal-overlay').waitFor({ state: 'attached', timeout: 120_000 });
}

async function gotoPortalHome(page: Page): Promise<void> {
  try {
    await page.goto(PORTAL_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('ERR_ABORTED') && !message.includes('Navigation interrupted')) {
      throw error;
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 120_000 }).catch(() => undefined);
  }
}

async function completeMicrosoftLogin(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  const deadline = Date.now() + 180_000;

  while (Date.now() < deadline) {
    const host = new URL(page.url()).hostname;

    if (host.includes('home.kcg.ac.jp')) {
      if ((await page.locator('#portal-overlay').count()) > 0) {
        return;
      }

      if (page.url().includes('LoginRedirect')) {
        await page.waitForURL(/home\.kcg\.ac\.jp\/portal/i, { timeout: 90_000 }).catch(() => undefined);
        if ((await page.locator('#portal-overlay').count()) > 0) {
          return;
        }
        if (!page.url().includes('/portal')) {
          await gotoPortalHome(page);
        }
        continue;
      }

      if (/\/Account\/Login/i.test(page.url())) {
        await tryClick(page, [
          'input[type="submit"]',
          'button[type="submit"]',
          '#btnLogin2',
          'a[href*="Login"]',
        ]);
        await page.waitForTimeout(800);
        continue;
      }

      if (!page.url().includes('/portal')) {
        await gotoPortalHome(page);
        continue;
      }
    }

    if (host.includes('login.microsoftonline.com') || host.includes('microsoftonline.com')) {
      const emailInput = page.locator(
        'input[type="email"], input[name="loginfmt"], input#i0116',
      );
      if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await emailInput.fill(email);
        await tryClick(page, ['input[type="submit"]', 'button[type="submit"]', '#idSIButton9']);
        await page.waitForTimeout(800);
      }

      const passwordInput = page.locator(
        'input[type="password"], input[name="passwd"], input#i0118',
      );
      if (await passwordInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await passwordInput.fill(password);
        await tryClick(page, ['input[type="submit"]', 'button[type="submit"]', '#idSIButton9']);
        await page.waitForTimeout(1_200);
      }

      await tryClick(page, [
        '#idSIButton9',
        'input[type="submit"][value="Yes"]',
        'button:has-text("はい")',
        'button:has-text("Yes")',
        'button:has-text("このまま")',
      ]);
    }

    const localEmail = page.locator('input[type="email"], input[name="loginfmt"]');
    if (
      host.includes('kcg') &&
      (await localEmail.isVisible({ timeout: 1_000 }).catch(() => false))
    ) {
      await localEmail.fill(email);
      await tryClick(page, ['input[type="submit"]', 'button[type="submit"]']);
    }

    await page.waitForTimeout(600);
  }

  throw new Error(`Microsoft ログインがタイムアウトしました（最終 URL: ${page.url()}）`);
}

async function tryClick(page: Page, selectors: string[]): Promise<boolean> {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if (await loc.isVisible({ timeout: 800 }).catch(() => false)) {
      await loc.click({ timeout: 5_000 }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

/** オンボーディングをスキップして拡張 UI だけ表示 */
export async function seedPortalStorageForTests(context: BrowserContext): Promise<void> {
  const sw = context.serviceWorkers()[0];
  if (!sw) return;

  await sw.evaluate(async (keys) => {
    await chrome.storage.local.set({
      [keys.language]: 'ja',
      [keys.portalLanguagePickerDone]: true,
      [keys.portalGuidedTourDone]: true,
      [keys.theme]: 'dark',
      [keys.home2WebMailOverlay]: true,
      [keys.cplanOverlay]: true,
    });
  }, SK);
}
