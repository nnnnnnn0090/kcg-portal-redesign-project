/**
 * portal-hooks.content — ポータル API フック + 再フェッチブリッジ（MAIN world）
 *
 * document_start、MAIN world で動作する。
 * ポータルが発行する fetch/XHR を傍受してレスポンスを postMessage で配信し、
 * 隔離ワールドからの再フェッチ要求（FETCH_HOOK.pageFetch）に認証ヘッダー付きで応答する。
 */

import { devWarn } from '../../lib/debug';
import { FETCH_HOOK, MSG } from '../../shared/constants';
import {
  PORTAL_API,
  PORTAL_API_DELIVERED_NEWS_NENDO,
  isPortalApiUrl,
  pathIncludesPortalApiSegment,
  pathLastSegment,
  pathnameIncludesFragment,
} from '../../lib/api-paths';

export default defineContentScript({
  matches: ['https://home.kcg.ac.jp/portal*'],
  runAt: 'document_start',
  world: 'MAIN',

  main() {
    installFetchHook();
    installFetchBridge();
  },
});

// ─── URL ユーティリティ ───────────────────────────────────────────────────────

function toAbs(u: string): string {
  try { return new URL(u, location.href).href; } catch { return u; }
}

function pathOf(u: string): string {
  try {
    let p = new URL(u, location.href).pathname;
    while (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
  } catch { return ''; }
}

// ─── API パス判定（セグメント名は shared/portal-api-paths と共通） ───────────

const isNewTopics       = (u: string) => pathIncludesPortalApiSegment(u, PORTAL_API.newTopics);
const isUserHtmlLink    = (u: string) => pathIncludesPortalApiSegment(u, PORTAL_API.userHtmlLink);
const isKogiCalendar    = (u: string) => pathIncludesPortalApiSegment(u, PORTAL_API.kogiCalendar);
const isHoshuCalendar   = (u: string) => pathIncludesPortalApiSegment(u, PORTAL_API.hoshuCalendar);
const isCampusCalendar  = (u: string) => pathIncludesPortalApiSegment(u, PORTAL_API.campusCalendar);
const isKogiNews        = (u: string) => pathIncludesPortalApiSegment(u, PORTAL_API.kogiNews);
const isKinoMessage     = (u: string) => pathIncludesPortalApiSegment(u, PORTAL_API.portalKinoMessage);
const isDeliveredNendo  = (u: string) => pathnameIncludesFragment(u, PORTAL_API_DELIVERED_NEWS_NENDO);
const isKyukoInfo       = (u: string) => pathLastSegment(u) === PORTAL_API.kyukoInfo;
const isHokoInfo        = (u: string) => pathLastSegment(u) === PORTAL_API.hokoInfo;
const isKyoshitsuChange = (u: string) => pathLastSegment(u) === PORTAL_API.kyoshitsuChange;
const isQuestionnaireInfo = (u: string) => pathLastSegment(u) === PORTAL_API.questionnaireInfo;

function isDeliveredDetail(u: string): boolean {
  const p = pathOf(u);
  if (p.includes(PORTAL_API_DELIVERED_NEWS_NENDO)) return false;
  const segs = p.split('/').filter(Boolean);
  const ix   = segs.indexOf(PORTAL_API.deliveredNews);
  return ix >= 0 && ix + 1 < segs.length && /^[0-9]+$/.test(segs[ix + 1]);
}

function shouldHook(u: string): boolean {
  return isNewTopics(u) || isUserHtmlLink(u) ||
         isKogiCalendar(u) || isHoshuCalendar(u) || isCampusCalendar(u) ||
         isKogiNews(u) || isKinoMessage(u) ||
         isDeliveredNendo(u) || isDeliveredDetail(u) ||
         isKyukoInfo(u) || isHokoInfo(u) || isKyoshitsuChange(u) ||
         isQuestionnaireInfo(u);
}

// ─── postMessage ヘルパー ─────────────────────────────────────────────────────

/** 長時間タブ放置時のメモリ肥大を防ぐ（リプレイは直近のキャプチャで十分なケースが多い） */
const MAX_CAPTURED_MESSAGES = 400;

const sentMessages: object[] = [];

function rememberSent(msg: object): void {
  sentMessages.push(msg);
  const over = sentMessages.length - MAX_CAPTURED_MESSAGES;
  if (over > 0) sentMessages.splice(0, over);
}

function post(type: string, payload: object): void {
  const msg = { type, source: FETCH_HOOK.source, ...payload };
  rememberSent(msg);
  window.postMessage(msg, '*');
}

function postWithUrl(type: string, url: string, items: unknown[]): void {
  post(type, { items, requestUrl: toAbs(url) });
}

function dispatch(url: string, json: unknown): void {
  // キノメッセージ（オブジェクト形式）
  if (isKinoMessage(url) && json && typeof json === 'object' && !Array.isArray(json)) {
    post(MSG.kinoMessage, { data: json });
    return;
  }
  // お知らせ詳細（オブジェクト形式、id あり）
  if (isDeliveredDetail(url) && json && !Array.isArray(json) && (json as Record<string, unknown>).id != null) {
    const data = json as Record<string, unknown>;
    if (String(data.id).length > 0) {
      post(MSG.deliveredNewsDetail, { data, requestUrl: toAbs(url) });
      return;
    }
  }
  if (!Array.isArray(json)) return;
  if (isNewTopics(url))          post(MSG.newTopics,          { items: json });
  if (isUserHtmlLink(url))       post(MSG.userHtmlLink,       { items: json });
  if (isKogiCalendar(url))       postWithUrl(MSG.kogiCalendar,       url, json);
  if (isHoshuCalendar(url))      postWithUrl(MSG.hoshuCalendar,      url, json);
  if (isCampusCalendar(url))     postWithUrl(MSG.campusCalendar,     url, json);
  if (isKogiNews(url))           post(MSG.kogiNews,           { items: json });
  if (isKyukoInfo(url))          postWithUrl(MSG.kyukoInfo,          url, json);
  if (isHokoInfo(url))           postWithUrl(MSG.hokoInfo,           url, json);
  if (isKyoshitsuChange(url))    postWithUrl(MSG.kyoshitsuChange,    url, json);
  if (isDeliveredNendo(url))     postWithUrl(MSG.deliveredNews,      url, json);
  if (isQuestionnaireInfo(url))  postWithUrl(MSG.questionnaireInfo,  url, json);
}

// ─── 認証ヘッダーのキャプチャ ─────────────────────────────────────────────────

declare global {
  interface Window { __portalCapturedApiHeaders?: Record<string, string>; }
}

const CAPTURE_HEADERS = ['X-CPAuthorize', 'X-Requested-With', 'Content-Type', 'Accept'];

function captureHeaders(url: string, headers: HeadersInit | undefined): void {
  if (!isPortalApiUrl(url) || !headers) return;
  try {
    const h = new Headers(headers);
    const cap = window.__portalCapturedApiHeaders ??= {};
    for (const k of CAPTURE_HEADERS) {
      const v = h.get(k);
      if (v) cap[k] = v;
    }
  } catch {}
}

function captureXhrHeader(url: string, name: string, value: string): void {
  if (!isPortalApiUrl(url)) return;
  if (!['x-cpauthorize', 'x-requested-with', 'content-type', 'accept'].includes(name.toLowerCase())) return;
  (window.__portalCapturedApiHeaders ??= {})[name] = value;
}

// ─── fetch パッチ ─────────────────────────────────────────────────────────────

function installFetchHook(): void {
  const origFetch = window.fetch;

  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input
      : input instanceof URL ? String(input)
      : input instanceof Request ? input.url
      : '';

    captureHeaders(url, init?.headers ?? (input instanceof Request ? input.headers : undefined));

    const p = origFetch.apply(this, [input, init] as Parameters<typeof fetch>);
    if (!shouldHook(url)) return p;

    return p.then((response) => {
      response.clone().json().then((json) => dispatch(url, json)).catch((err) => {
        devWarn('portal-hooks: response JSON parse failed', url, err);
      });
      return response;
    });
  };

  // リプレイ要求：過去に送ったメッセージを全て再送する
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (!e.data || e.data.type !== FETCH_HOOK.replayRequest) return;
    for (const msg of sentMessages) window.postMessage(msg, '*');
  });

  // XHR パッチ
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
    (this as XMLHttpRequest & { _portalUrl?: string })._portalUrl = String(url);
    return origOpen.apply(this, arguments as unknown as Parameters<typeof origOpen>);
  };

  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
    const self = this as XMLHttpRequest & { _portalUrl?: string };
    if (self._portalUrl) captureXhrHeader(self._portalUrl, name, value);
    return origSetHeader.apply(this, arguments as unknown as [string, string]);
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    const self = this as XMLHttpRequest & { _portalUrl?: string };
    const u = String(self._portalUrl ?? '');
    if (shouldHook(u)) {
      this.addEventListener('load', function () {
        try { dispatch(u, JSON.parse(this.responseText)); } catch (err) {
          devWarn('portal-hooks: XHR JSON parse failed', u, err);
        }
      });
    }
    return origSend.apply(this, arguments as unknown as Parameters<typeof origSend>);
  };
}

// ─── 再フェッチブリッジ ───────────────────────────────────────────────────────

/**
 * 隔離ワールドからの pageFetch 要求を受け取り、認証ヘッダー付きで fetch を実行する。
 *
 * レスポンス本文は隔離ワールドへ postMessage しない。ポータル本体の fetch/XHR は
 * installFetchHook 側で傍受済みのため、ここでは主に MAIN ワールドでセッション・
 * ヘッダキャッシュを温め、401 時に短い間隔で再試行する役割とする。
 */
function installFetchBridge(): void {
  const BASE_HEADERS: Record<string, string> = {
    'Accept':           'application/json, text/javascript, */*; q=0.01',
    'Content-Type':     'application/json; charset=utf-8',
    'X-Requested-With': 'XMLHttpRequest',
  };

  function hasCpAuthorize(): boolean {
    const cap = window.__portalCapturedApiHeaders;
    if (!cap) return false;
    return Object.keys(cap).some(k => k.toLowerCase() === 'x-cpauthorize' && cap[k]);
  }

  function doFetch(url: string, attempt: number): void {
    const headers = { ...BASE_HEADERS, ...(window.__portalCapturedApiHeaders ?? {}) };
    fetch(url, { credentials: 'include', cache: 'no-store', headers })
      .then((response) => {
        if (response.status === 401 && attempt < 10) {
          const delay = Math.min(100 + attempt * 200, 2200);
          setTimeout(() => doFetch(url, attempt + 1), delay);
        }
      })
      .catch((err) => {
        devWarn('portal-hooks: pageFetch bridge failed', url, err);
      });
  }

  function waitAndFetch(url: string): void {
    const deadline = Date.now() + 15000;
    function check() {
      if (hasCpAuthorize() || Date.now() >= deadline) { doFetch(url, 0); return; }
      setTimeout(check, 40);
    }
    check();
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (!e.data || e.data.type !== FETCH_HOOK.pageFetch) return;
    const url = e.data.url;
    if (url) waitAndFetch(String(url));
  });
}
