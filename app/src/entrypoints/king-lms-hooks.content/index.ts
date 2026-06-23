/**
 * King LMS オリジンで `document_start`・MAIN ワールドとして読み込まれます。
 * `fetch` / XHR をフックし、コース一覧や calendarItems の結果を同一タブの `king-lms-bridge` へ `postMessage` します。
 */

import {
  assignmentSyncCalendarRange,
  calendarItemsToDueItems,
  mergeDueItems,
} from '../../lib/calendar-items-to-due-items';
import { enrichDueItemsWithSubmissionStatus } from '../../lib/gradebook-submission-status';
import { appendKingLmsApiCapture, isKingLmsApiUrl } from '../../lib/king-lms-api-capture';
import { normalizeCalendarItemsResponse } from '../../lib/king-lms-calendar-response';
import type { DueItem } from '../../features/calendar/assignment';
import { KING_LMS_HOOK, KING_LMS_HOSTNAME, KING_LMS_ORIGIN } from '../../shared/constants';

export default defineContentScript({
  matches: [`${KING_LMS_ORIGIN}/*`],
  runAt: 'document_start',
  world: 'MAIN',

  main() {
    installKingLmsHook();
  },
});

// ─── URL 判定 ─────────────────────────────────────────────────────────────────

const MEMBERSHIPS_RE = /^\/learn\/api\/v1\/users\/[^/]+\/memberships(?:\/|$)/;
const CALENDAR_ITEMS_PATH = '/learn/api/v1/calendars/calendarItems';

function isMembershipsUrl(url: string): boolean {
  try { return MEMBERSHIPS_RE.test(new URL(url, location.href).pathname); } catch { return false; }
}

function isCalendarItemsUrl(url: string): boolean {
  try {
    const p = new URL(url, location.href).pathname;
    return p === CALENDAR_ITEMS_PATH;
  } catch { return false; }
}

function isCalendarPage(): boolean {
  try { return /\/ultra\/calendar/.test(location.pathname); } catch { return false; }
}

// ─── データ型 ─────────────────────────────────────────────────────────────────

interface CourseEntry {
  displayName:       string | null;
  externalAccessUrl: string | null;
}

// ─── calendarItems 収集 ───────────────────────────────────────────────────────

let collectedDueItems: DueItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let wideFetchStarted = false;
let wideFetchSettled = false;
let wideFetchFailed = false;
let assignmentFlushDone = false;
let kingLmsOrigFetch: typeof fetch = (...args) => fetch(...args);

function resetAssignmentCollection(): void {
  collectedDueItems = [];
  wideFetchStarted = false;
  wideFetchSettled = false;
  wideFetchFailed = false;
  assignmentFlushDone = false;
  if (flushTimer != null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function ingestCalendarItems(json: unknown): void {
  const rows = normalizeCalendarItemsResponse(json);
  if (rows === null) {
    if (collectedDueItems.length === 0 && wideFetchSettled) notifyAssignmentFailure();
    return;
  }
  const due = calendarItemsToDueItems(rows);
  if (due.length > 0) collectedDueItems.push(...due);
  scheduleAssignmentFlush();
}

function scheduleAssignmentFlush(): void {
  if (assignmentFlushDone) return;
  if (flushTimer != null) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { flushTimer = null; void flushAssignmentDue(); }, 700);
}

async function flushAssignmentDue(): Promise<void> {
  if (assignmentFlushDone) return;
  if (isCalendarPage() && wideFetchStarted && !wideFetchSettled) {
    scheduleAssignmentFlush();
    return;
  }

  const merged = mergeDueItems(collectedDueItems);
  assignmentFlushDone = true;
  if (merged.length === 0) {
    if (wideFetchFailed) notifyAssignmentFailure();
    else postAssignmentDue([], Date.now(), { assignmentSyncNoOp: true });
    return;
  }
  await enrichAndPostAssignmentDue(merged);
}

function startWideCalendarFetch(origFetch: typeof fetch): void {
  if (!isCalendarPage() || wideFetchStarted) return;
  wideFetchStarted = true;
  const { since, until } = assignmentSyncCalendarRange();
  const url = `${KING_LMS_ORIGIN}${CALENDAR_ITEMS_PATH}?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`;
  void origFetch(url)
    .then(r => {
      wideFetchSettled = true;
      if (!r.ok) { wideFetchFailed = true; return; }
      return r.json().then(ingestCalendarItems).catch(() => { wideFetchFailed = true; });
    })
    .catch(() => {
      wideFetchSettled = true;
      wideFetchFailed = true;
    });
}

// ─── ハンドラ ─────────────────────────────────────────────────────────────────

function handleMemberships(json: unknown): void {
  const results = (json as Record<string, unknown>)?.results;
  if (!Array.isArray(results)) return;
  const courses: CourseEntry[] = results.map((entry) => {
    const c = (entry as Record<string, unknown>)?.course as Record<string, unknown> | undefined;
    return {
      displayName:       c?.displayName       != null ? String(c.displayName)       : null,
      externalAccessUrl: c?.externalAccessUrl != null ? String(c.externalAccessUrl) : null,
    };
  });
  try {
    window.postMessage({ type: KING_LMS_HOOK.coursesPostType, source: KING_LMS_HOOK.source, courses }, '*');
  } catch {}
}

function postAssignmentDue(
  items: DueItem[],
  capturedAt: number,
  extra?: {
    captureState?: 'error';
    assignmentSyncNoOp?: boolean;
  },
): void {
  try {
    window.postMessage(
      {
        type: KING_LMS_HOOK.assignmentDuePostType,
        source: KING_LMS_HOOK.source,
        items,
        capturedAt,
        ...extra,
      },
      '*',
    );
  } catch {}
}

function notifyAssignmentFailure(): void {
  postAssignmentDue([], Date.now(), { captureState: 'error' });
}

async function enrichAndPostAssignmentDue(items: DueItem[]): Promise<void> {
  const enriched = await enrichDueItemsWithSubmissionStatus(items, kingLmsOrigFetch);
  postAssignmentDue(enriched, Date.now());
}

function maybeCaptureApiResponse(url: string, json: unknown): void {
  if (!isKingLmsApiUrl(url)) return;
  appendKingLmsApiCapture(url, json);
}

// ─── フック インストール ───────────────────────────────────────────────────────

function installKingLmsHook(): void {
  const origFetch = window.fetch.bind(window);
  kingLmsOrigFetch = origFetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input
      : input instanceof URL ? String(input)
      : input instanceof Request ? input.url : '';

    const p = origFetch.apply(this, [input, init] as Parameters<typeof fetch>);

    if (isKingLmsApiUrl(url)) {
      p.then(r => {
        if (!r.ok) return;
        r.clone().json().then(j => maybeCaptureApiResponse(url, j)).catch(() => {});
      }).catch(() => {});
    }
    if (isMembershipsUrl(url)) {
      p.then(r => r.clone().json().then(handleMemberships).catch(() => {})).catch(() => {});
    }
    if (isCalendarItemsUrl(url)) {
      p.then(r => {
        if (!r.ok) {
          if (collectedDueItems.length === 0 && wideFetchSettled) notifyAssignmentFailure();
          return;
        }
        r.clone().json().then(ingestCalendarItems).catch(() => {
          if (collectedDueItems.length === 0 && wideFetchSettled) notifyAssignmentFailure();
        });
      }).catch(() => {
        if (collectedDueItems.length === 0 && wideFetchSettled) notifyAssignmentFailure();
      });
    }
    return p;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
    (this as XMLHttpRequest & { _kingLmsUrl?: string })._kingLmsUrl = String(url);
    return origOpen.apply(this, arguments as unknown as Parameters<typeof origOpen>);
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    const self = this as XMLHttpRequest & { _kingLmsUrl?: string };
    const u = String(self._kingLmsUrl ?? '');
    if (isKingLmsApiUrl(u)) {
      this.addEventListener('load', function () {
        try {
          if (this.status < 200 || this.status >= 300) return;
          maybeCaptureApiResponse(u, JSON.parse(this.responseText));
        } catch {}
      });
    }
    if (isMembershipsUrl(u)) {
      this.addEventListener('load', function () {
        try { handleMemberships(JSON.parse(this.responseText)); } catch {}
      });
    }
    if (isCalendarItemsUrl(u)) {
      this.addEventListener('load', function () {
        try {
          if (this.status < 200 || this.status >= 300) {
            if (collectedDueItems.length === 0 && wideFetchSettled) notifyAssignmentFailure();
            return;
          }
          ingestCalendarItems(JSON.parse(this.responseText));
        } catch {
          if (collectedDueItems.length === 0 && wideFetchSettled) notifyAssignmentFailure();
        }
      });
    }
    return origSend.apply(this, arguments as unknown as Parameters<typeof origSend>);
  };

  if (isCalendarPage()) {
    resetAssignmentCollection();
    startWideCalendarFetch(origFetch);
  }

  function notifyLoginRedirect(): void {
    try {
      if (location.hostname !== KING_LMS_HOSTNAME) return;
      const path = location.pathname ?? '';
      if (path !== '/' && path !== '') return;
      if (!new URLSearchParams(location.search).has('new_loc')) return;
      window.postMessage({ type: KING_LMS_HOOK.syncAbortType, source: KING_LMS_HOOK.source, reason: 'loginRedirect' }, '*');
    } catch {}
  }

  function patchHistory(methodName: 'pushState' | 'replaceState'): void {
    const orig = history[methodName];
    if (typeof orig !== 'function') return;
    history[methodName] = function () {
      const ret = orig.apply(this, arguments as unknown as Parameters<typeof orig>);
      notifyLoginRedirect();
      if (isCalendarPage() && !wideFetchStarted) startWideCalendarFetch(origFetch);
      return ret;
    };
  }

  notifyLoginRedirect();
  patchHistory('pushState');
  patchHistory('replaceState');
  window.addEventListener('popstate', notifyLoginRedirect);
}
