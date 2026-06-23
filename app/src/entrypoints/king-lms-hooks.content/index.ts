/**
 * King LMS オリジンで `document_start`・MAIN ワールドとして読み込まれます。
 * `fetch` / XHR をフックし、コース一覧や streams/ultra の結果を同一タブの `king-lms-bridge` へ `postMessage` します。
 */

import { isStreamsUltraLoadingPlaceholder } from '../../lib/streams-ultra-response';
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
  courseId:          unknown;
  courseName:        string;
  title:             unknown;
  dueDate:           string;
  /** notificationDetails.sourceId（同一課題の複数ストリーム行のマージに使用） */
  sourceId?:         string;
  /** extraAttribs.event_type（例 UA:DUE, UA:UA_AVAIL） */
  streamEventType?: string;
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

/**
 * streams/ultra の結果を `king-lms-bridge` へ渡すための `postMessage` です。
 * `bridge-message-listener` が受け取り、`saveAssignmentDue` でストレージに反映されます。
 */
function postStreamsUltraDue(
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
        type: KING_LMS_HOOK.streamsDuePostType,
        source: KING_LMS_HOOK.source,
        items,
        capturedAt,
        ...extra,
      },
      '*',
    );
  } catch {}
}

function notifyStreamsFailure(): void {
  postStreamsUltraDue([], Date.now(), { captureState: 'error' });
}

function handleStreamsUltra(json: unknown): void {
  try {
    if (!json || typeof json !== 'object') { notifyStreamsFailure(); return; }
    const se = (json as Record<string, unknown>).sv_streamEntries;
    if (!Array.isArray(se)) { notifyStreamsFailure(); return; }
    // 未ロードのプレースホルダー（sv_moreData=true 等）は King LMS 本体レスが来るまで無視する
    if (se.length === 0) {
      if (isStreamsUltraLoadingPlaceholder(json)) return;
      postStreamsUltraDue([], Date.now(), { assignmentSyncNoOp: true });
      return;
    }
    const nameByCourseId = courseIdToNameMap(json);
    const slim: DueItem[] = [];
    for (const item of se) {
      const row = item as Record<string, unknown>;
      const isd = row?.itemSpecificData as Record<string, unknown>;
      const nd  = isd?.notificationDetails as Record<string, unknown>;
      const dd  = nd?.dueDate;
      if (dd == null || String(dd).trim() === '') continue;
      const cid    = nd?.courseId;
      const cidStr = cid != null ? String(cid) : '';
      const extra  = row?.extraAttribs as Record<string, unknown> | undefined;
      const evtRaw = extra?.event_type;
      const sidRaw = nd?.sourceId;
      const streamEventType = evtRaw != null && String(evtRaw).trim() !== ''
        ? String(evtRaw).trim()
        : undefined;
      const sourceId = sidRaw != null && String(sidRaw).trim() !== ''
        ? String(sidRaw).trim()
        : undefined;
      slim.push({
        courseId:   cid,
        courseName: cidStr && nameByCourseId[cidStr] != null ? nameByCourseId[cidStr] : '',
        title:      isd?.title,
        dueDate:    String(dd),
        sourceId,
        streamEventType,
      });
    }
    /** 行はあるが締切が取れないレスは空保存しない（別レスとのレースで一覧が消える）。同期完了だけ bridge へ委譲 */
    if (slim.length === 0) {
      postStreamsUltraDue([], Date.now(), { assignmentSyncNoOp: true });
      return;
    }
    postStreamsUltraDue(slim, Date.now());
  } catch { notifyStreamsFailure(); }
}

// ─── フック インストール ───────────────────────────────────────────────────────

function installKingLmsHook(): void {
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

  /** ルート URL かつ `new_loc` クエリでログインへ飛ばされるとき、同期ペンディングを打ち切る `postMessage` を送ります。 */
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
      return ret;
    };
  }

  notifyLoginRedirect();
  patchHistory('pushState');
  patchHistory('replaceState');
  window.addEventListener('popstate', notifyLoginRedirect);
}
