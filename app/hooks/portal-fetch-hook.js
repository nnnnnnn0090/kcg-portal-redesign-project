/**
 * hooks/portal-fetch-hook.js — ポータル API フック（MAIN world）
 *
 * ロード順: document_start、MAIN world。
 * このファイルは隔離ワールドの P 名前空間にアクセスできない。
 * page-fetch-bridge.js（同 world）と同時にロードされる。
 *
 * 役割:
 *   1. ポータルが発行する fetch / XHR をフックして API レスポンスを傍受する
 *   2. 傍受したデータを postMessage で隔離ワールドの boot.js へ配信する
 *   3. ポータル API の認証ヘッダーを window.__portalCapturedApiHeaders に保存する
 *      （portal-fetch-bridge.js の再フェッチで使い回す）
 *
 * 送信済みメッセージは sentMessages に保持し、boot.js からリプレイ要求が来たら再送する。
 * これにより content script のロード前に来たデータの取りこぼしを防ぐ。
 */
(function () {
  'use strict';

  // postMessage の source 識別子（boot.js の FETCH_HOOK.source と合わせる）
  var TAG = 'portalThemeFetchObserver';
  // boot.js からのリプレイ要求 type（boot.js の FETCH_HOOK.replayRequest と合わせる）
  var REPLAY_REQUEST = 'portalThemeReplayIntercepted';

  // ────────────────────────────────────────────
  // URL ユーティリティ
  // ────────────────────────────────────────────

  function toAbs(u) {
    try { return new URL(String(u), location.href).href; } catch (e) { return String(u); }
  }

  function pathOf(u) {
    try {
      var p = new URL(String(u), location.href).pathname;
      while (p.length > 1 && p.slice(-1) === '/') p = p.slice(0, -1);
      return p;
    } catch (e) { return ''; }
  }

  function pathContains(u, seg) { return pathOf(u).indexOf(seg) !== -1; }

  function lastSeg(u) {
    var parts = pathOf(u).split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
  }

  // ────────────────────────────────────────────
  // API パス判定
  //
  // 傍受・ヘッダーキャプチャの対象 URL を判定する関数群。
  // 新しい API を傍受したい場合はここに関数を追加して shouldHook() に追記する。
  // ────────────────────────────────────────────

  function isApiUrl(u)          { return pathContains(u, '/portal/api/'); }
  function isNewTopics(u)       { return pathContains(u, '/api/NewTopics'); }
  function isUserHtmlLink(u)    { return pathContains(u, '/api/UserHtmlLink'); }
  function isKogiCalendar(u)    { return pathContains(u, '/api/KogiCalendar'); }
  function isHoshuCalendar(u)   { return pathContains(u, '/api/HoshuCalendar'); }
  function isCampusCalendar(u)  { return pathContains(u, '/api/CampusCalendar'); }
  function isKogiNews(u)        { return pathContains(u, '/api/KogiNews'); }
  function isKinoMessage(u)     { return pathContains(u, '/api/PortalKinoMessage'); }
  function isDeliveredNendo(u)  { return pathContains(u, '/api/DeliveredNews/Nendo/'); }
  function isKyukoInfo(u)       { return lastSeg(u) === 'KyukoInfo'; }
  function isHokoInfo(u)        { return lastSeg(u) === 'HokoInfo'; }
  function isKyoshitsuChange(u) { return lastSeg(u) === 'KyoshitsuChangeInfo'; }
  function isQuestionnaireInfo(u) { return lastSeg(u) === 'questionnaireInfo'; }

  // お知らせ詳細: /api/DeliveredNews/:numberId 形式（年度別一覧とは区別する）
  function isDeliveredDetail(u) {
    var p = pathOf(u);
    if (p.indexOf('/api/DeliveredNews/Nendo/') !== -1) return false;
    var segs = p.split('/').filter(Boolean);
    var ix = segs.indexOf('DeliveredNews');
    return ix >= 0 && ix + 1 < segs.length && /^[0-9]+$/.test(segs[ix + 1]);
  }

  // フックが必要な URL かどうかをまとめて判定する
  function shouldHook(u) {
    return isNewTopics(u) || isUserHtmlLink(u) ||
           isKogiCalendar(u) || isHoshuCalendar(u) || isCampusCalendar(u) ||
           isKogiNews(u) || isKinoMessage(u) ||
           isDeliveredNendo(u) || isDeliveredDetail(u) ||
           isKyukoInfo(u) || isHokoInfo(u) || isKyoshitsuChange(u) ||
           isQuestionnaireInfo(u);
  }

  // ────────────────────────────────────────────
  // postMessage ヘルパー
  // ────────────────────────────────────────────

  // 送信済みメッセージを保持してリプレイに備える
  var sentMessages = [];

  function post(type, payload) {
    var msg = Object.assign({ type: type, source: TAG }, payload);
    sentMessages.push(msg);
    window.postMessage(msg, '*');
  }

  function postWithUrl(type, url, items) {
    post(type, { items: items, requestUrl: toAbs(url) });
  }

  // boot.js からリプレイ要求を受けて保持済みメッセージを全て再送する
  window.addEventListener('message', function (e) {
    if (e.source !== window) return;
    if (!e.data || e.data.type !== REPLAY_REQUEST) return;
    for (var i = 0; i < sentMessages.length; i++) {
      window.postMessage(sentMessages[i], '*');
    }
  });

  // ────────────────────────────────────────────
  // URL とレスポンス JSON から適切な postMessage を送信する
  // ────────────────────────────────────────────

  function dispatch(url, json) {
    // キノメッセージ: オブジェクト形式
    if (isKinoMessage(url) && json && typeof json === 'object' && !Array.isArray(json)) {
      post('portalThemePortalKinoMessageCaptured', { data: json });
      return;
    }

    // お知らせ詳細: id フィールドが必須
    if (isDeliveredDetail(url) && json && !Array.isArray(json) && json.id != null && String(json.id).length > 0) {
      post('portalThemeDeliveredNewsDetailCaptured', { data: json, requestUrl: toAbs(url) });
      return;
    }

    // 以下はすべて配列レスポンス
    if (!Array.isArray(json)) return;

    if (isNewTopics(url))         post('portalThemeNewTopicsCaptured',              { items: json });
    if (isUserHtmlLink(url))      post('portalThemeUserHtmlLinkCaptured',           { items: json });
    if (isKogiCalendar(url))      postWithUrl('portalThemeKogiCalendarCaptured',    url, json);
    if (isHoshuCalendar(url))     postWithUrl('portalThemeHoshuCalendarCaptured',   url, json);
    if (isCampusCalendar(url))    postWithUrl('portalThemeCampusCalendarCaptured',  url, json);
    if (isKogiNews(url))          post('portalThemeKogiNewsCaptured',               { items: json });
    if (isKyukoInfo(url))         postWithUrl('portalThemeKyukoInfoCaptured',       url, json);
    if (isHokoInfo(url))          postWithUrl('portalThemeHokoInfoCaptured',        url, json);
    if (isKyoshitsuChange(url))   postWithUrl('portalThemeKyoshitsuChangeInfoCaptured', url, json);
    if (isDeliveredNendo(url))    postWithUrl('portalThemeDeliveredNewsCaptured',   url, json);
    if (isQuestionnaireInfo(url)) postWithUrl('portalThemeQuestionnaireInfoCaptured', url, json);
  }

  // ────────────────────────────────────────────
  // 認証ヘッダーのキャプチャ
  //
  // ポータルが発行する fetch/XHR に含まれる X-CPAuthorize 等を
  // window.__portalCapturedApiHeaders に保存する。
  // portal-fetch-bridge.js の再フェッチ時に使い回す。
  // ────────────────────────────────────────────

  var CAPTURE_HEADERS = ['X-CPAuthorize', 'X-Requested-With', 'Content-Type', 'Accept'];

  function captureHeaders(url, init) {
    if (!isApiUrl(String(url)) || !init || !init.headers) return;
    try {
      var h = new Headers(init.headers);
      var cap = window.__portalCapturedApiHeaders || (window.__portalCapturedApiHeaders = {});
      CAPTURE_HEADERS.forEach(function (k) {
        var v = h.get(k);
        if (v) cap[k] = v;
      });
    } catch (e) {}
  }

  function captureXhrHeader(url, name, value) {
    if (!isApiUrl(String(url))) return;
    var nl = name.toLowerCase();
    var targets = ['x-cpauthorize', 'x-requested-with', 'content-type', 'accept'];
    if (targets.indexOf(nl) === -1) return;
    var cap = window.__portalCapturedApiHeaders || (window.__portalCapturedApiHeaders = {});
    cap[name] = value;
  }

  // ────────────────────────────────────────────
  // fetch のパッチ
  // ────────────────────────────────────────────

  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input
      : (typeof URL !== 'undefined' && input instanceof URL) ? String(input)
      : (input instanceof Request) ? input.url
      : (input && input.url) ? input.url : '';

    captureHeaders(url, init || (input instanceof Request && { headers: input.headers }));

    var p = origFetch.apply(this, arguments);

    if (!shouldHook(url)) return p;

    return p.then(function (response) {
      // オリジナルのレスポンスはそのまま呼び出し元へ返す
      response.clone().json().then(function (json) { dispatch(url, json); }).catch(function () {});
      return response;
    });
  };

  // ────────────────────────────────────────────
  // XMLHttpRequest のパッチ
  // ────────────────────────────────────────────

  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._portalUrl = url;
    return origOpen.apply(this, arguments);
  };

  var origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this._portalUrl) captureXhrHeader(this._portalUrl, name, value);
    return origSetHeader.apply(this, arguments);
  };

  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    var u = String(this._portalUrl || '');
    if (shouldHook(u)) {
      this.addEventListener('load', function () {
        try { dispatch(u, JSON.parse(this.responseText)); } catch (e) {}
      });
    }
    return origSend.apply(this, arguments);
  };

})();
