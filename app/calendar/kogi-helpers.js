/**
 * calendar/kogi-helpers.js — 授業カレンダー固有のヘルパー関数
 *
 * ロード順: document_idle（ui/settings-panel.js の後）。
 *
 * 授業カレンダーに特有の処理を担当する純粋関数の集合:
 *   - ツールチップからの時限・教室抽出
 *   - シラバス参照 URL の組み立て
 *   - King LMS コース一覧との照合によるリンク URL の取得
 *
 * 公開: P.parseKogiMeta, P.kogiPeriodTimeRange, P.syllabusUrl,
 *        P.findKingLmsUrl, P.kogiEventHref
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // シラバス参照 URL のベース（講義コードをクエリパラメータで渡す）
  const SYLLABUS_BASE = 'https://home.kcg.ac.jp/Gakusei/web/Syllabus/WebSyllabusSansho/UI/WSL_SyllabusSansho.aspx';

  // 時限番号 → 講義時間帯の対応表
  const PERIOD_TIMES = {
    1: '09:30 ~ 11:00',
    2: '11:10 ~ 12:40',
    3: '13:30 ~ 15:00',
    4: '15:10 ~ 16:40',
    5: '16:50 ~ 18:20',
  };

  // ────────────────────────────────────────────
  // ツールチップからのメタ情報抽出
  // ────────────────────────────────────────────

  /**
   * 授業ツールチップ HTML から時限番号と教室名を取り出す。
   *
   * @param {string} tooltip - API レスポンスの tooltip フィールド（HTML 文字列）
   * @returns {{ period: string, room: string }}
   */
  function parseKogiMeta(tooltip) {
    const t       = String(tooltip || '');
    const periodM = t.match(/時限[：:]\s*(\d+)/);
    const roomM   = t.match(/教室[：:]\s*([^<\r\n]+)/);
    return {
      period: periodM ? periodM[1] : '',
      room:   roomM   ? roomM[1].trim() : '',
    };
  }

  /**
   * 時限番号文字列から表示用の時間帯文字列を返す（例: "09:30 ~ 11:00"）。
   * @param {string} periodStr
   * @returns {string}
   */
  function kogiPeriodTimeRange(periodStr) {
    const n = parseInt(String(periodStr || '').trim(), 10);
    return PERIOD_TIMES[n] || '';
  }

  // ────────────────────────────────────────────
  // タイトルパース
  // ────────────────────────────────────────────

  /**
   * カレンダーの title フィールド（例: "3 ゲームＡＩ１【駅前校】"）を
   * 先頭の時限番号と残りの講義名に分解する。
   *
   * @param {string} title
   * @returns {{ firstNum: string, rest: string }}
   */
  function parseLeadingPeriodTitle(title) {
    const s = String(title || '').trim();
    const m = s.match(/^\s*(\d+)\s+(.+)$/s);
    if (m) return { firstNum: m[1], rest: m[2].trim() };
    return { firstNum: '', rest: s };
  }

  /**
   * 授業イベントの時限番号（1〜5）を返す。
   * 取れなければ null（空きコマスペーサー挿入のソート用）。
   *
   * @param {{ tooltip?: string, title?: string }} ev
   * @returns {number | null}
   */
  function kogiPeriodNum(ev) {
    const { period: periodFromTip }  = parseKogiMeta(ev.tooltip);
    const { firstNum }               = parseLeadingPeriodTitle(ev.title);
    const period                     = periodFromTip || firstNum;
    const n = parseInt(String(period || '').trim(), 10);
    if (Number.isNaN(n) || n < 1 || n > 5) return null;
    return n;
  }

  // ────────────────────────────────────────────
  // シラバス URL の組み立て
  // ────────────────────────────────────────────

  /**
   * ツールチップまたはプレーンテキストから講義コードを抽出する。
   * 「講義コード:」ラベルが見つからない場合はプレーンテキストの 3 行目を使う。
   *
   * @param {string} tooltip  - HTML 形式のツールチップ
   * @param {string} tipPlain - プレーンテキスト形式のツールチップ
   * @returns {string}
   */
  function parseKozaCode(tooltip, tipPlain) {
    const re = /(?:講義コード|コード)\s*[：:]\s*([^\s<\r\n]+)/;
    const fromHtml  = String(tooltip  || '').match(re);
    if (fromHtml) return fromHtml[1].trim();
    const fromPlain = String(tipPlain || '').match(re);
    if (fromPlain) return fromPlain[1].trim();
    // ラベルなし: 3 行目をコードとみなす
    const lines = String(tipPlain || '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 3) {
      const third   = lines[2];
      const labeled = third.match(/^(?:講義コード|コード)\s*[：:]\s*(.+)$/);
      return (labeled ? labeled[1] : third).trim();
    }
    return '';
  }

  /**
   * 授業コードからシラバス参照 URL を組み立てる。
   * コードが取得できない場合は空文字を返す。
   *
   * @param {string} tooltip
   * @param {string} tipPlain
   * @returns {string}
   */
  function syllabusUrl(tooltip, tipPlain) {
    const code = parseKozaCode(tooltip, tipPlain);
    if (!code) return '';
    const u = new URL(SYLLABUS_BASE);
    u.searchParams.set('P1', code);
    return u.href;
  }

  // ────────────────────────────────────────────
  // King LMS URL の照合
  // ────────────────────────────────────────────

  /**
   * displayName の中に「月曜3限」のような 曜日+時限 が含まれ、
   * firstNum と一致するか判定する。一致するものを優先して絞り込むために使う。
   *
   * @param {string} displayName - King LMS のコース名（例: "2025前期 ゲームＡＩ１ 火3"）
   * @param {string} firstNum    - カレンダー title の先頭の時限番号
   * @returns {boolean}
   */
  function displayNameMatchesPeriod(displayName, firstNum) {
    if (!firstNum || !displayName) return true;
    const re = /(?:月|火|水|木|金|土|日)(\d+)/g;
    let m;
    while ((m = re.exec(displayName)) !== null) {
      if (m[1] === firstNum) return true;
    }
    return false;
  }

  /**
   * King LMS のコース一覧から、カレンダーの title に対応する
   * externalAccessUrl を返す。
   * 複数候補がある場合は時限番号で絞り込む。
   *
   * @param {Array<{ displayName?: string, externalAccessUrl?: string }>} courseRows
   * @param {string} title - カレンダーイベントの title
   * @returns {string}
   */
  function findKingLmsUrl(courseRows, title) {
    const rows = Array.isArray(courseRows) ? courseRows : [];
    if (rows.length === 0) return '';

    const { firstNum, rest } = parseLeadingPeriodTitle(title);
    if (!rest) return '';

    const candidates = rows.filter(
      (r) => r && r.displayName && r.externalAccessUrl && String(r.displayName).includes(rest),
    );
    if (candidates.length === 0) return '';
    if (candidates.length === 1) return String(candidates[0].externalAccessUrl);

    // 時限番号で絞り込む（候補が複数ある場合）
    const withPeriod = candidates.filter((r) => displayNameMatchesPeriod(r.displayName, firstNum));
    return String(withPeriod.length >= 1 ? withPeriod[0].externalAccessUrl : candidates[0].externalAccessUrl);
  }

  /**
   * 設定に応じてシラバス URL または King LMS URL を返す。
   *
   * @param {string} tooltip
   * @param {string} tipPlain
   * @param {boolean} useKingLms
   * @param {string} title
   * @param {Array} kingLmsCourses
   * @returns {string}
   */
  function kogiEventHref(tooltip, tipPlain, useKingLms, title, kingLmsCourses) {
    if (useKingLms) return findKingLmsUrl(kingLmsCourses, title);
    return syllabusUrl(tooltip, tipPlain);
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  Object.assign(P, {
    parseKogiMeta,
    kogiPeriodTimeRange,
    kogiPeriodNum,
    parseLeadingPeriodTitle,
    syllabusUrl,
    findKingLmsUrl,
    kogiEventHref,
  });

})(typeof globalThis !== 'undefined' ? globalThis : window);
