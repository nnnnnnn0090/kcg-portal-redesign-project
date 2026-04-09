/**
 * hooks/king-lms-fetch-hook.js — King LMS fetch フック（MAIN world）
 *
 * ロード順: document_start、MAIN world、https://king-lms.kcg.edu/* のみ。
 *
 * 役割:
 *   King LMS の fetch / XHR をフックし、
 *   /learn/api/v1/users/{id}/memberships レスポンスから
 *   { displayName, externalAccessUrl } の配列を取り出して postMessage で送る。
 *
 *   /learn/api/v1/streams/ultra の JSON から、
 *   notificationDetails.dueDate があるエントリについて
 *   { courseId, courseName, title, dueDate } だけの配列を組み立て、
 *   console に出すほか postMessage → king-lms-bridge で extension storage に保存する。
 *   sv_streamEntries が空配列のときは postMessage しない（課題同期中はオーバーレイ待機を続ける。
 *   ブリッジ側タイムアウトでポータルへ戻す）。
 *   JSON パース失敗・HTTP エラー・sv_streamEntries 欠落（配列でない）では captureState: error を送り、
 *   キャッシュを壊さずにポータルへ戻す。
 *   courseName は同レスポンスの sv_extras.sx_courses[].id / name で courseId と突き合わせる。
 *
 *   また、ログインリダイレクトページ（?new_loc）を検知した場合は
 *   SPA ナビゲーションにも対応して 'portalThemeKingLmsSyncAbort' を送る。
 *
 * 受け取り側: bridges/king-lms-bridge.js（隔離ワールド）
 */
(function () {
  'use strict';

  var MSG_TYPE         = 'portalThemeKingLmsCourses';
  var STREAMS_DUE_TYPE = 'portalThemeKingLmsStreamsUltraDue';
  var ABORT_TYPE       = 'portalThemeKingLmsSyncAbort';
  var MSG_SRC          = 'portalThemeKingLmsHook';

  // /learn/api/v1/users/_13919_1/memberships?expand=... の形式に一致させる
  var MEMBERSHIPS_RE = /^\/learn\/api\/v1\/users\/[^/]+\/memberships(?:\/|$)/;

  function isMembershipsUrl(url) {
    try {
      var u = new URL(String(url), location.href);
      return MEMBERSHIPS_RE.test(u.pathname);
    } catch (e) { return false; }
  }

  function isStreamsUltraUrl(url) {
    try {
      var u = new URL(String(url), location.href);
      var p = u.pathname;
      return p === '/learn/api/v1/streams/ultra' || p.indexOf('/learn/api/v1/streams/ultra/') === 0;
    } catch (e) { return false; }
  }

  /**
   * memberships レスポンスを解析してコース一覧を postMessage で送る。
   * @param {object} json - memberships API レスポンス
   */
  function handleMemberships(json) {
    var results = json && json.results;
    if (!Array.isArray(results)) return;
    var courses = results.map(function (entry) {
      var c = entry && entry.course;
      return {
        displayName:       c && c.displayName       != null ? c.displayName       : null,
        externalAccessUrl: c && c.externalAccessUrl != null ? c.externalAccessUrl : null,
      };
    });
    try {
      window.postMessage({ type: MSG_TYPE, source: MSG_SRC, courses: courses }, '*');
    } catch (e) {}
  }

  /**
   * sv_extras.sx_courses から courseId → コース名のルックアップを作る。
   * @param {object} json - streams/ultra レスポンス
   * @returns {Object<string, string>}
   */
  function courseIdToNameMapFromStreamsUltra(json) {
    var map = {};
    var courses = json && json.sv_extras && json.sv_extras.sx_courses;
    if (!Array.isArray(courses)) return map;
    for (var k = 0; k < courses.length; k++) {
      var row = courses[k];
      if (!row || row.id == null) continue;
      var id = String(row.id);
      if (row.name != null && String(row.name).trim() !== '') map[id] = row.name;
    }
    return map;
  }

  /**
   * streams/ultra のうち dueDate がある行だけ、courseId / courseName / title / dueDate に絞ってコンソールに出す。
   * @param {object} json
   */
  function notifyStreamsUltraFailure() {
    try {
      window.postMessage({
        type:         STREAMS_DUE_TYPE,
        source:       MSG_SRC,
        items:        [],
        capturedAt:   Date.now(),
        captureState: 'error',
      }, '*');
    } catch (err) {}
  }

  function logStreamsUltraJson(json) {
    try {
      if (!json || typeof json !== 'object') {
        notifyStreamsUltraFailure();
        return;
      }
      var se = json.sv_streamEntries;
      if (!Array.isArray(se)) {
        notifyStreamsUltraFailure();
        return;
      }
      if (se.length === 0) return;
      var nameByCourseId = courseIdToNameMapFromStreamsUltra(json);
      var slim = [];
      for (var i = 0; i < se.length; i++) {
        var item = se[i];
        var isd = item && item.itemSpecificData;
        var nd = isd && isd.notificationDetails;
        var dd = nd && nd.dueDate;
        if (dd == null || String(dd).trim() === '') continue;
        var cid = nd.courseId;
        var cidStr = cid != null ? String(cid) : '';
        slim.push({
          courseId:   cid,
          courseName: cidStr && nameByCourseId[cidStr] != null ? nameByCourseId[cidStr] : '',
          title:      isd.title,
          dueDate:    dd,
        });
      }
      if (slim.length > 0) {
        console.log('[portalThemeKingLmsStreamsUltra]', slim);
      }
      try {
        window.postMessage({
          type:       STREAMS_DUE_TYPE,
          source:     MSG_SRC,
          items:      slim,
          capturedAt: Date.now(),
        }, '*');
      } catch (err) {}
    } catch (e) {
      notifyStreamsUltraFailure();
    }
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

    var p = origFetch.apply(this, arguments);

    if (isMembershipsUrl(url)) {
      p.then(function (response) {
        response.clone().json()
          .then(function (json) { handleMemberships(json); })
          .catch(function () {});
      }).catch(function () {});
    }

    if (isStreamsUltraUrl(url)) {
      p.then(function (response) {
        if (!response.ok) {
          notifyStreamsUltraFailure();
          return;
        }
        response.clone().json()
          .then(function (json) { logStreamsUltraJson(json); })
          .catch(function () { notifyStreamsUltraFailure(); });
      }).catch(function () { notifyStreamsUltraFailure(); });
    }

    return p;
  };

  // ────────────────────────────────────────────
  // XMLHttpRequest のパッチ
  // ────────────────────────────────────────────

  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._kingLmsUrl = url;
    return origOpen.apply(this, arguments);
  };

  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    var u = String(this._kingLmsUrl || '');
    if (isMembershipsUrl(u)) {
      this.addEventListener('load', function () {
        try {
          var json = JSON.parse(this.responseText);
          handleMemberships(json);
        } catch (e) {}
      });
    }
    if (isStreamsUltraUrl(u)) {
      this.addEventListener('load', function () {
        try {
          if (this.status < 200 || this.status >= 300) {
            notifyStreamsUltraFailure();
            return;
          }
          var json = JSON.parse(this.responseText);
          logStreamsUltraJson(json);
        } catch (e) {
          notifyStreamsUltraFailure();
        }
      });
    }
    return origSend.apply(this, arguments);
  };

  // ────────────────────────────────────────────
  // ログインリダイレクト検知
  //
  // King LMS のログインページ（?new_loc パラメータあり）に飛ばされた場合、
  // ストレージのコース同期フラグをキャンセルする必要がある。
  // SPA ナビゲーション（pushState / replaceState / popstate）にも対応する。
  // ────────────────────────────────────────────

  function notifyLoginRedirectIfNeeded() {
    try {
      if (location.hostname !== 'king-lms.kcg.edu') return;
      var path = location.pathname || '';
      if (path !== '/' && path !== '') return;
      if (!new URLSearchParams(location.search).has('new_loc')) return;
      window.postMessage({ type: ABORT_TYPE, source: MSG_SRC, reason: 'loginRedirect' }, '*');
    } catch (e) {}
  }

  function patchHistoryMethod(methodName) {
    var orig = history[methodName];
    if (typeof orig !== 'function') return;
    history[methodName] = function () {
      var ret = orig.apply(this, arguments);
      notifyLoginRedirectIfNeeded();
      return ret;
    };
  }

  notifyLoginRedirectIfNeeded();
  patchHistoryMethod('pushState');
  patchHistoryMethod('replaceState');
  window.addEventListener('popstate', notifyLoginRedirectIfNeeded);

})();
