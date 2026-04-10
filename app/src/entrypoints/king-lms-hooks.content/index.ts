/**
 * king-lms-hooks.content — King LMS fetch フック（MAIN world）
 *
 * document_start、MAIN world で動作する。king-lms.kcg.edu のみ。
 * memberships API と streams/ultra API を傍受してコース/課題データを postMessage で送る。
 * ログインリダイレクトも検知して中断通知を送る。
 */

export default defineContentScript({
  matches: ['https://king-lms.kcg.edu/*'],
  runAt: 'document_start',
  world: 'MAIN',

  main() {
    installKingLmsHook();
  },
});

// ─── 定数 ─────────────────────────────────────────────────────────────────────

const MSG_TYPE         = 'portalThemeKingLmsCourses';
const STREAMS_DUE_TYPE = 'portalThemeKingLmsStreamsUltraDue';
const ABORT_TYPE       = 'portalThemeKingLmsSyncAbort';
const MSG_SRC          = 'portalThemeKingLmsHook';

// ─── URL 判定 ─────────────────────────────────────────────────────────────────

const MEMBERSHIPS_RE = /^\/learn\/api\/v1\/users\/[^/]+\/memberships(?:\/|$)/;

function isMembershipsUrl(url: string): boolean {
  try { return MEMBERSHIPS_RE.test(new URL(url, location.href).pathname); } catch { return false; }
}

function isStreamsUltraUrl(url: string): boolean {
  try {
    const p = new URL(url, location.href).pathname;
    return p === '/learn/api/v1/streams/ultra' || p.startsWith('/learn/api/v1/streams/ultra/');
  } catch { return false; }
}

// ─── データ型 ─────────────────────────────────────────────────────────────────

interface CourseEntry {
  displayName:       string | null;
  externalAccessUrl: string | null;
}

interface DueItem {
  courseId:   unknown;
  courseName: string;
  title:      unknown;
  dueDate:    string;
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
  try { window.postMessage({ type: MSG_TYPE, source: MSG_SRC, courses }, '*'); } catch {}
}

function courseIdToNameMap(json: unknown): Record<string, string> {
  const map: Record<string, string> = {};
  const list = ((json as Record<string, unknown>)?.sv_extras as Record<string, unknown>)?.sx_courses;
  if (!Array.isArray(list)) return map;
  for (const row of list) {
    const r = row as Record<string, unknown>;
    if (r?.id == null) continue;
    if (r.name != null && String(r.name).trim() !== '') map[String(r.id)] = String(r.name);
  }
  return map;
}

function notifyStreamsFailure(): void {
  try {
    window.postMessage({ type: STREAMS_DUE_TYPE, source: MSG_SRC, items: [], capturedAt: Date.now(), captureState: 'error' }, '*');
  } catch {}
}

function handleStreamsUltra(json: unknown): void {
  try {
    if (!json || typeof json !== 'object') { notifyStreamsFailure(); return; }
    const se = (json as Record<string, unknown>).sv_streamEntries;
    if (!Array.isArray(se)) { notifyStreamsFailure(); return; }
    if (se.length === 0) return;
    const nameByCourseId = courseIdToNameMap(json);
    const slim: DueItem[] = [];
    for (const item of se) {
      const isd = (item as Record<string, unknown>)?.itemSpecificData as Record<string, unknown>;
      const nd  = isd?.notificationDetails as Record<string, unknown>;
      const dd  = nd?.dueDate;
      if (dd == null || String(dd).trim() === '') continue;
      const cid    = nd?.courseId;
      const cidStr = cid != null ? String(cid) : '';
      slim.push({
        courseId:   cid,
        courseName: cidStr && nameByCourseId[cidStr] != null ? nameByCourseId[cidStr] : '',
        title:      isd?.title,
        dueDate:    String(dd),
      });
    }
    window.postMessage({ type: STREAMS_DUE_TYPE, source: MSG_SRC, items: slim, capturedAt: Date.now() }, '*');
  } catch { notifyStreamsFailure(); }
}

// ─── フック インストール ───────────────────────────────────────────────────────

function installKingLmsHook(): void {
  // fetch パッチ
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input
      : input instanceof URL ? String(input)
      : input instanceof Request ? input.url : '';

    const p = origFetch.apply(this, [input, init] as Parameters<typeof fetch>);

    if (isMembershipsUrl(url)) {
      p.then(r => r.clone().json().then(handleMemberships).catch(() => {})).catch(() => {});
    }
    if (isStreamsUltraUrl(url)) {
      p.then(r => {
        if (!r.ok) { notifyStreamsFailure(); return; }
        r.clone().json().then(handleStreamsUltra).catch(notifyStreamsFailure);
      }).catch(notifyStreamsFailure);
    }
    return p;
  };

  // XHR パッチ
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
    (this as XMLHttpRequest & { _kingLmsUrl?: string })._kingLmsUrl = String(url);
    return origOpen.apply(this, arguments as unknown as Parameters<typeof origOpen>);
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    const self = this as XMLHttpRequest & { _kingLmsUrl?: string };
    const u = String(self._kingLmsUrl ?? '');
    if (isMembershipsUrl(u)) {
      this.addEventListener('load', function () {
        try { handleMemberships(JSON.parse(this.responseText)); } catch {}
      });
    }
    if (isStreamsUltraUrl(u)) {
      this.addEventListener('load', function () {
        try {
          if (this.status < 200 || this.status >= 300) { notifyStreamsFailure(); return; }
          handleStreamsUltra(JSON.parse(this.responseText));
        } catch { notifyStreamsFailure(); }
      });
    }
    return origSend.apply(this, arguments as unknown as Parameters<typeof origSend>);
  };

  // ログインリダイレクト検知
  function notifyLoginRedirect(): void {
    try {
      if (location.hostname !== 'king-lms.kcg.edu') return;
      const path = location.pathname ?? '';
      if (path !== '/' && path !== '') return;
      if (!new URLSearchParams(location.search).has('new_loc')) return;
      window.postMessage({ type: ABORT_TYPE, source: MSG_SRC, reason: 'loginRedirect' }, '*');
    } catch {}
  }

  function patchHistory(methodName: 'pushState' | 'replaceState'): void {
    const orig = history[methodName];
    if (typeof orig !== 'function') return;
    history[methodName] = function () {
      const ret = orig.apply(this, arguments as unknown as Parameters<typeof orig>);
      notifyLoginRedirect();
      return ret;
    };
  }

  notifyLoginRedirect();
  patchHistory('pushState');
  patchHistory('replaceState');
  window.addEventListener('popstate', notifyLoginRedirect);
}
