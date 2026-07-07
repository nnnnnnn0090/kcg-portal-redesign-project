import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { Worker } from '@playwright/test';
import { readExtensionStorage, SK } from './storage-helpers';

const KING_LMS_HOOK = {
  source: 'portalThemeKingLmsHook',
  coursesPostType: 'portalThemeKingLmsCourses',
  assignmentDuePostType: 'portalThemeKingLmsAssignmentDue',
} as const;

export async function postKingLmsCourses(page: Page): Promise<void> {
  await postKingLmsMessage(page, KING_LMS_HOOK.coursesPostType, {
    courses: [
      {
        displayName: 'E2E Course',
        externalAccessUrl: 'https://king-lms.kcg.edu/ultra/courses/_123_1',
      },
    ],
  });
}

export async function postKingLmsAssignmentDue(page: Page): Promise<void> {
  await postKingLmsMessage(page, KING_LMS_HOOK.assignmentDuePostType, {
    items: [
      {
        courseId: 'course-1',
        courseName: 'E2E Course',
        title: 'E2E Assignment',
        dueDate: '2026-12-31T23:59:00.000Z',
        sourceId: 'assignment-1',
      },
    ],
    capturedAt: Date.now(),
  });
}

async function postKingLmsMessage(
  page: Page,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await page.evaluate(
        ({ hook, messageType, body }) => {
          window.postMessage({ type: messageType, source: hook.source, ...body }, '*');
        },
        { hook: KING_LMS_HOOK, messageType: type, body: payload },
      );
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('Execution context was destroyed') || attempt >= 4) {
        throw error;
      }
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(400);
    }
  }
}

export async function ensureKingLmsCoursePage(page: Page): Promise<void> {
  if (!page.url().includes('/ultra/course')) {
    await page.goto('https://king-lms.kcg.edu/ultra/course', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForLoadState('domcontentloaded');
  }
}

export async function ensureKingLmsCalendarPage(page: Page): Promise<void> {
  if (!page.url().includes('/ultra/calendar')) {
    await page.goto('https://king-lms.kcg.edu/ultra/calendar', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  }
}

const KING_LMS_LOGIN_REDIRECT_URL = 'https://king-lms.kcg.edu/?new_loc=%2Fultra%2Fcourse';
const PORTAL_HOME_URL = 'https://home.kcg.ac.jp/portal/';

/** Keep the login-redirect URL stable so cancelPendingForLoginRedirect can run while logged in. */
export async function installKingLmsLoginRedirectStub(context: BrowserContext): Promise<void> {
  await context.route(/king-lms\.kcg\.edu\/?(\?.*)?$/i, async (route) => {
    const url = route.request().url();
    if (!url.includes('new_loc=')) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!DOCTYPE html><html><head><title>King LMS login redirect</title></head><body></body></html>',
    });
  });
}

/** Simulate SAML/login interrupt before real course hooks complete sync. */
export async function simulateKingLmsLoginInterrupt(page: Page, worker: Worker): Promise<void> {
  if (!page.url().includes('new_loc=')) {
    await page.goto(KING_LMS_LOGIN_REDIRECT_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
  }
  await expect
    .poll(async () => {
      const storage = await readExtensionStorage(worker, [
        SK.kingLmsSyncAwaitCourse,
        SK.kingLmsSyncReturnUrl,
      ]);
      return storage[SK.kingLmsSyncAwaitCourse] === true
        && String(storage[SK.kingLmsSyncReturnUrl] ?? '').includes('home.kcg.ac.jp/portal');
    }, { timeout: 30_000 })
    .toBe(true);
}

/** Wait for portal redirect after course sync; fall back to manual navigation. */
export async function waitForPortalReturnAfterKingLmsSync(
  page: Page,
  worker: Worker,
  timeoutMs = 120_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (/home\.kcg\.ac\.jp\/portal/i.test(page.url())) return;

    const storage = await readExtensionStorage(worker, [
      SK.kingLmsSyncPending,
      SK.kingLmsSyncReturnUrl,
      SK.kingLmsCourses,
    ]);
    const courses = storage[SK.kingLmsCourses];
    const syncDone =
      storage[SK.kingLmsSyncPending] === false
      && storage[SK.kingLmsSyncReturnUrl] === ''
      && Array.isArray(courses)
      && courses.length > 0;
    if (syncDone) break;

    await page.waitForTimeout(500);
  }

  if (!/home\.kcg\.ac\.jp\/portal/i.test(page.url())) {
    await page.goto(PORTAL_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }
}
