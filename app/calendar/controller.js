/**
 * calendar/controller.js — カレンダーコントローラー工場関数
 *
 * ロード順: document_idle（calendar/grid-builder.js の後）。
 *
 * 週/月ビューの切替・前後ナビゲーション・データ取得・再描画を管理する。
 *
 * 【クライアント集約モード (clientDataMode)】
 * 初回表示後に暦年1本分のデータをバックグラウンドで取得する。
 * 取得完了後は API を叩かずクライアント側でフィルタリングして描画するため、
 * 前後ナビゲーションが即時レスポンスで動作する。
 * 年境界に達したときだけ追加取得する（extend）。
 *
 * 【アニメーション設計】
 * ナビゲーション（前後）: 横スライド（anim.applyCalSwipe）
 * モード切替（週↔月）  : 入場フェードは使わない（データ到着後すぐ表示）
 * 高さ変化             : スムーズトランジション（anim.setCalBodyHtmlSmooth）
 *
 * 【アニメーション方針】
 * - ナビゲーション（prev/next）: スワイプのみ。
 * - モード切替（週↔月）       : スワイプも入場フェードも再生しない（高さスムーズのみ）。
 * - その他（設定変更・拡張完了）: アニメなし（高さ変化のみ）。
 *
 * applyPanelVisibility の enterAnim は呼び出し側が都度指定する（現在は常に false）。
 *
 * 公開: P.createCalendarController(config)
 *   → { wireNav, processMessage, applyEmptyVisibility, refreshCalLinks }
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  /**
   * カレンダーコントローラーを生成する。
   *
   * @param {{
   *   calUrl: (params: { uKbn: string, start: string, end: string }) => string,
   *   calKind?: string,
   *   titles: { week: string, month: string },
   *   hideWhenEmpty?: boolean,
   *   getForceVisible?: () => boolean,
   *   getCalLinkKingLms?: () => boolean,
   *   getKingLmsCourses?: () => unknown[],
   *   els: {
   *     panel: Element | null,
   *     body: Element | null,
   *     title: Element | null,
   *     range: Element | null,
   *     prev: HTMLButtonElement | null,
   *     next: HTMLButtonElement | null,
   *     modeWeek: HTMLButtonElement | null,
   *     modeMonth: HTMLButtonElement | null,
   *   }
   * }} config
   * @returns {{
   *   wireNav: () => void,
   *   processMessage: (d: object) => void,
   *   applyEmptyVisibility: () => void,
   *   refreshCalLinks: () => void,
   * }}
   */
  function createCalendarController(config) {
    const { calUrl, titles, els } = config;
    const calKind        = config.calKind || '';
    const hideWhenEmpty  = !!config.hideWhenEmpty;
    const getForceVisible  = config.getForceVisible  ?? (() => false);
    const getCalLinkKingLms  = config.getCalLinkKingLms  ?? (() => false);
    const getKingLmsCourses  = config.getKingLmsCourses  ?? (() => []);

    // ────────────────────────────────────────────
    // 内部状態
    // ────────────────────────────────────────────

    let viewMode   = 'week';   // 'week' | 'month'
    let weekParams = null;     // { uKbn, start, end } — 現在表示中の週範囲
    let monthRef   = null;     // { y, m } — 現在表示中の月
    let storedUKbn = null;     // ポータルから取得した uKbn（ユーザー区分）
    let pendingKey = null;   // フェッチ中リクエストのキー ("start|end" 形式)
    let loading    = false;  // フェッチ中フラグ

    // 直前に受信・描画したデータ（設定変更時の再描画に使う）
    let lastItems  = null;
    let lastParsed = null;

    // クライアント集約モード
    let clientDataMode = false;
    let bulkItems      = null;
    let bulkParsed     = null;  // { start, end } — バルクデータのカバー範囲
    let bulkFetching   = false;
    let bulkFetchKind  = null;  // null | 'initial' | 'extend-next' | 'extend-prev'
    let pendingExtend  = null;  // 拡張完了後に遷移するビュー情報

    // スワイプアニメーション中フラグ（ナビゲーションをブロックする）
    let swipeAnimating = false;

    const rangeKey = (s, e) => `${s}|${e}`;

    // ────────────────────────────────────────────
    // UI 状態更新
    // ────────────────────────────────────────────

    function setNavEnabled() {
      const uOk   = !!(storedUKbn || weekParams?.uKbn);
      const busy  = loading || bulkFetching || swipeAnimating;
      const ready = !busy && uOk
        && ((viewMode === 'week' && !!weekParams) || (viewMode === 'month' && !!monthRef));
      if (els.prev) els.prev.disabled = !ready;
      if (els.next) els.next.disabled = !ready;
    }

    function setModeUI() {
      els.modeWeek?.classList.toggle('is-active', viewMode === 'week');
      els.modeMonth?.classList.toggle('is-active', viewMode === 'month');
      if (els.title) els.title.textContent = viewMode === 'month' ? titles.month : titles.week;
      els.panel?.classList.toggle('is-month', viewMode === 'month');
    }

    function setRangeLabel() {
      if (!els.range) return;
      if (viewMode === 'month' && monthRef) {
        els.range.textContent = `${monthRef.y}年${monthRef.m + 1}月`;
      } else if (weekParams) {
        els.range.textContent = `${weekParams.start.replace(/-/g, '/')} 〜 ${weekParams.end.replace(/-/g, '/')}`;
      } else {
        els.range.textContent = '';
      }
    }

    // ────────────────────────────────────────────
    // クライアント集約モードのヘルパー
    // ────────────────────────────────────────────

    /** 現在ビューに対応するパース互換オブジェクトを返す */
    function visibleParsed() {
      const uK = storedUKbn || weekParams?.uKbn;
      if (!uK) return null;
      if (viewMode === 'month' && monthRef) {
        return { uKbn: uK, ...P.sixWeekRange(monthRef.y, monthRef.m) };
      }
      if (weekParams) return { uKbn: uK, start: weekParams.start, end: weekParams.end };
      return null;
    }

    /**
     * バルクデータの境界を越えるナビゲーションか判定する。
     *
     * 週モード: 次/前の週範囲が bulkParsed の外側に出るか。
     * 月モード: 目標の月のイベント範囲が bulkParsed の外側に出るか。
     *           【重要】sixWeekRange（6週表示範囲）ではなく月単位で判定する。
     *           こうしないと、12月（6週範囲が翌年1月まで含む）が不要な拡張を
     *           トリガーしてしまい「予定はありません」と誤表示される。
     */
    function atNavBoundary(dir) {
      if (!bulkParsed?.start || !bulkParsed?.end) return false;

      if (viewMode === 'week' && weekParams) {
        const p = dir === 'prev' ? P.prevWeekRange(weekParams) : P.nextWeekRange(weekParams);
        return dir === 'prev' ? p.start < bulkParsed.start : p.end > bulkParsed.end;
      }

      if (viewMode === 'month' && monthRef) {
        const cand = P.shiftMonthRef(monthRef, dir === 'prev' ? -1 : 1);
        // 目標月の最初の日
        const candStart  = `${cand.y}-${String(cand.m + 1).padStart(2, '0')}-01`;
        // 目標月の翌月の最初の日（= 目標月の末日の翌日）
        const nextMStart = cand.m === 11
          ? `${cand.y + 1}-01-01`
          : `${cand.y}-${String(cand.m + 2).padStart(2, '0')}-01`;
        return candStart < bulkParsed.start || nextMStart > bulkParsed.end;
      }

      return false;
    }

    /** 重複なしでイベントリストを結合する（年拡張時のマージ用） */
    function mergeCalItemLists(a, b) {
      const seen = new Set();
      const out  = [];
      for (const ev of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
        if (!ev || ev.start == null || ev.start === '') continue;
        const day = P.calEventDayIso(ev);
        if (!day) continue;
        const tip = String(ev.tooltip || '').slice(0, 120);
        const k   = `${day}\0${String(ev.title || '')}\0${tip}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(ev);
      }
      return out;
    }

    // ────────────────────────────────────────────
    // 描画ヘルパー
    // ────────────────────────────────────────────

    function viewMetaForRender() {
      return {
        mode:           viewMode,
        monthRef,
        calLinkKingLms: getCalLinkKingLms(),
        kingLmsCourses: getKingLmsCourses(),
        calKind,
      };
    }

    /**
     * パネルの表示制御と HTML 書き込みを行う。
     *
     * @param {string} html        - 表示する HTML（授業・課題は空でもグリッド）
     * @param {boolean} hasItems   - 表示範囲にイベントがあるか（hideWhenEmpty 判定用）
     * @param {{
     *   enterAnim?: boolean,      - モード入場アニメを再生するか
     *   afterDone?: () => void,   - 書き込み完了後のコールバック
     * }} [opts]
     */
    function applyPanelVisibility(html, hasItems, opts = {}) {
      const { enterAnim = false, afterDone } = opts;

      if (hideWhenEmpty && !hasItems && !getForceVisible()) {
        if (els.panel) els.panel.hidden = true;
        afterDone?.();
        return;
      }

      if (els.panel) els.panel.hidden = false;

      P.anim.setCalBodyHtmlSmooth(els.body, html, () => {
        // モード入場アニメは、呼び出し元（switchMode）から明示的に要求された時のみ再生する
        if (enterAnim) P.anim.playCalModeEnterAnim(els.body);
        afterDone?.();
      });
    }

    // ────────────────────────────────────────────
    // 描画（クライアント集約モード）
    // ────────────────────────────────────────────

    /**
     * バルクデータから現在のビューを再描画する。
     *
     * @param {{ enterAnim?: boolean }} [opts]
     */
    function redrawFromClient(opts = {}) {
      if (!clientDataMode || !bulkParsed) return;
      const vp = visibleParsed();
      if (!vp?.start || !vp?.end) return;

      const filtered = P.filterCalItemsByRange(bulkItems, vp.start, vp.end);
      lastItems  = filtered;
      lastParsed = vp;

      setRangeLabel();
      setNavEnabled();

      const gridHtml = P.buildCalendarGridHtml(filtered, vp, viewMetaForRender());
      applyPanelVisibility(gridHtml, filtered.length > 0, opts);
    }

    // ────────────────────────────────────────────
    // 描画（サーバーレスポンスから）
    // ────────────────────────────────────────────

    /**
     * @param {unknown[]} items
     * @param {{ start: string, end: string, uKbn: string }} parsed
     * @param {{ enterAnim?: boolean }} [opts]
     */
    function redraw(items, parsed, opts = {}) {
      if (clientDataMode && bulkParsed) { redrawFromClient(opts); return; }

      setRangeLabel();
      setNavEnabled();

      const gridHtml = P.buildCalendarGridHtml(items, parsed, viewMetaForRender());
      applyPanelVisibility(gridHtml, items.length > 0, opts);
    }

    // ────────────────────────────────────────────
    // フェッチ
    // ────────────────────────────────────────────

    /**
     * 指定範囲のカレンダーデータをフェッチする。
     *
     * @param {{ uKbn?: string, start: string, end: string }} params
     * @param {{ lockBodyHeight?: boolean }} [opts]
     *   lockBodyHeight: true の場合、読み込み中にカレンダー本体の高さを固定する（モード切替時のガタつき防止）。
     */
    function fetchRange(params, opts = {}) {
      if (loading || swipeAnimating) return;

      const uKbn = params.uKbn || storedUKbn || weekParams?.uKbn;
      if (!uKbn) return;

      const payload = { uKbn, start: params.start, end: params.end };
      pendingKey    = rangeKey(payload.start, payload.end);
      loading       = true;

      if (hideWhenEmpty && els.panel) els.panel.hidden = false;
      if (els.body) {
        els.body.dataset.calLoading = '';
        els.body.dataset.calMode    = viewMode;
        // モード切替のとき: 現在の高さを固定して loading 中のガタつきを防ぐ
        if (opts.lockBodyHeight) {
          const h = Math.round(els.body.getBoundingClientRect().height);
          if (h > 64) els.body.style.minHeight = `${h}px`;
        } else {
          els.body.style.minHeight = '';
        }
      }

      P.anim.setCalBodyHtmlSmooth(
        els.body,
        '<p class="p-empty p-cal-loading-msg">読み込み中…</p>',
      );
      setNavEnabled();
      P.pageFetch(calUrl(payload));
    }

    /** バックグラウンドで暦年1本分を取得する（初回レイアウト確定後に呼ぶ） */
    function queueBulkYearFetch() {
      if (bulkItems !== null || bulkFetching || clientDataMode) return;
      const uK = storedUKbn || weekParams?.uKbn;
      if (!uK || !weekParams || loading) return;

      bulkFetching  = true;
      bulkFetchKind = 'initial';
      const yr      = P.calendarYearRangeFromIso(weekParams.start);
      pendingKey    = rangeKey(yr.start, yr.end);
      setNavEnabled();
      P.pageFetch(calUrl({ uKbn: uK, start: yr.start, end: yr.end }));
    }

    /** 年境界の外へナビゲーションするとき、隣の暦年を追加取得する */
    function queueBulkExtend(dir) {
      if (bulkFetching || loading || swipeAnimating) return;
      const uK = storedUKbn || weekParams?.uKbn;
      if (!uK || !bulkParsed) return;

      const yr = dir === 'next'
        ? P.calendarYearRangeFromIso(bulkParsed.end)
        : P.calendarYearRangeBeforeInclusiveStart(bulkParsed.start);

      bulkFetchKind = dir === 'next' ? 'extend-next' : 'extend-prev';

      // 拡張完了後に遷移するビュー情報をあらかじめ記録しておく
      if (viewMode === 'week' && weekParams) {
        const np = dir === 'next' ? P.nextWeekRange(weekParams) : P.prevWeekRange(weekParams);
        pendingExtend = { weekParams: np, monthRef: P.isoToMonthRef(np.start) };
      } else if (viewMode === 'month' && monthRef) {
        pendingExtend = { monthRef: P.shiftMonthRef(monthRef, dir === 'next' ? 1 : -1) };
      } else {
        bulkFetchKind = null;
        return;
      }

      bulkFetching = true;
      pendingKey   = rangeKey(yr.start, yr.end);
      setNavEnabled();
      P.pageFetch(calUrl({ uKbn: uK, start: yr.start, end: yr.end }));
    }

    // ────────────────────────────────────────────
    // 状態保存ヘルパー
    // ────────────────────────────────────────────

    function syncMonthRefFromWeek() {
      if (weekParams) monthRef = P.isoToMonthRef(weekParams.start);
    }

    /** 受信したリクエスト情報を現在の表示対象として確定する */
    function storeFromParsed(parsed, isMonth) {
      storedUKbn = parsed.uKbn;
      if (isMonth) {
        const mid = P.parseIsoLocal(P.addDaysIso(parsed.start, 21));
        monthRef  = { y: mid.getFullYear(), m: mid.getMonth() };
        if (weekParams === null)
          weekParams = { uKbn: parsed.uKbn, start: parsed.start, end: P.addDaysIso(parsed.start, 7) };
      } else {
        weekParams = parsed;
        if (monthRef === null) monthRef = P.isoToMonthRef(parsed.start);
      }
    }

    /** 表示対象ではないリクエスト情報を補助的に保存する（状態を上書きしない） */
    function storePassive(parsed, isMonth) {
      storedUKbn = parsed.uKbn;
      if (isMonth) {
        if (monthRef === null) {
          const mid = P.parseIsoLocal(P.addDaysIso(parsed.start, 21));
          monthRef  = { y: mid.getFullYear(), m: mid.getMonth() };
        }
        if (weekParams === null)
          weekParams = { uKbn: parsed.uKbn, start: parsed.start, end: P.addDaysIso(parsed.start, 7) };
      } else if (weekParams === null) {
        weekParams = parsed;
        if (monthRef === null) monthRef = P.isoToMonthRef(parsed.start);
      }
    }

    // ────────────────────────────────────────────
    // ビューモード切替
    // ────────────────────────────────────────────

    function switchMode(mode) {
      if (loading || bulkFetching || swipeAnimating) return;
      if (mode === viewMode) return;

      const uK = storedUKbn || weekParams?.uKbn;
      if (mode === 'month' && (!monthRef || !uK)) return;
      if (mode === 'week'  && !weekParams)        return;

      viewMode = mode;
      setModeUI();

      if (clientDataMode && bulkParsed) {
        if (mode === 'month' && !monthRef) monthRef = P.isoToMonthRef(weekParams.start);
        redrawFromClient({ enterAnim: false });
        return;
      }

      if (mode === 'month') {
        fetchRange({ uKbn: uK, ...P.sixWeekRange(monthRef.y, monthRef.m) }, { lockBodyHeight: true });
      } else {
        fetchRange(weekParams, { lockBodyHeight: true });
      }
    }

    // ────────────────────────────────────────────
    // ナビゲーション（前/次ボタン）
    // ────────────────────────────────────────────

    function navigatePrev() {
      if (loading || bulkFetching || swipeAnimating) return;

      if (clientDataMode && bulkParsed) {
        if (atNavBoundary('prev')) { queueBulkExtend('prev'); return; }
        navigateClientSide('prev');
        return;
      }

      // サーバーモード: モード切替専用のオプションは渡さない
      const uK = storedUKbn || weekParams?.uKbn;
      if (viewMode === 'week' && weekParams) {
        fetchRange(P.prevWeekRange(weekParams));
      } else if (viewMode === 'month' && monthRef && uK) {
        monthRef = P.shiftMonthRef(monthRef, -1);
        fetchRange({ uKbn: uK, ...P.sixWeekRange(monthRef.y, monthRef.m) });
      }
    }

    function navigateNext() {
      if (loading || bulkFetching || swipeAnimating) return;

      if (clientDataMode && bulkParsed) {
        if (atNavBoundary('next')) { queueBulkExtend('next'); return; }
        navigateClientSide('next');
        return;
      }

      // サーバーモード: モード切替専用のオプションは渡さない
      const uK = storedUKbn || weekParams?.uKbn;
      if (viewMode === 'week' && weekParams) {
        fetchRange(P.nextWeekRange(weekParams));
      } else if (viewMode === 'month' && monthRef && uK) {
        monthRef = P.shiftMonthRef(monthRef, 1);
        fetchRange({ uKbn: uK, ...P.sixWeekRange(monthRef.y, monthRef.m) });
      }
    }

    /** クライアントデータでの前後ナビゲーション（横スライドアニメーション付き） */
    function navigateClientSide(dir) {
      const meta0 = viewMetaForRender();
      const vp0   = visibleParsed();
      if (!vp0) return;

      const oldHtml = P.buildCalendarGridHtml(
        P.filterCalItemsByRange(bulkItems, vp0.start, vp0.end),
        vp0, meta0,
      );

      // ビュー状態を更新する
      if (viewMode === 'week' && weekParams) {
        weekParams = dir === 'prev' ? P.prevWeekRange(weekParams) : P.nextWeekRange(weekParams);
        syncMonthRefFromWeek();
      } else if (viewMode === 'month' && monthRef) {
        monthRef = P.shiftMonthRef(monthRef, dir === 'prev' ? -1 : 1);
      } else {
        return;
      }

      const vp1      = visibleParsed();
      if (!vp1) return;

      const newItems = P.filterCalItemsByRange(bulkItems, vp1.start, vp1.end);
      const newHtml  = P.buildCalendarGridHtml(newItems, vp1, viewMetaForRender());

      lastItems  = newItems;
      lastParsed = vp1;
      setRangeLabel();

      if (hideWhenEmpty && newItems.length === 0 && !getForceVisible()) {
        if (els.panel) els.panel.hidden = true;
        setNavEnabled();
        return;
      }
      if (els.panel) els.panel.hidden = false;

      swipeAnimating = true;
      setNavEnabled();

      P.clearCalBodyLoadingAttrs(els.body);
      P.anim.applyCalSwipe(els.body, dir, oldHtml, newHtml, () => {
        swipeAnimating = false;
        setNavEnabled();
      });
    }

    // ────────────────────────────────────────────
    // 公開 API: ナビゲーションの配線
    // ────────────────────────────────────────────

    function wireNav() {
      els.prev?.addEventListener('click', navigatePrev);
      els.next?.addEventListener('click', navigateNext);
      els.modeWeek?.addEventListener('click',  () => switchMode('week'));
      els.modeMonth?.addEventListener('click', () => switchMode('month'));
    }

    // ────────────────────────────────────────────
    // 公開 API: postMessage レスポンスの処理
    // ────────────────────────────────────────────

    /**
     * hook から届いたカレンダーレスポンスを処理する。
     * @param {{ items: unknown[], requestUrl: string }} d
     */
    function processMessage(d) {
      const parsed = d.requestUrl ? P.parseCalendarRequest(d.requestUrl) : null;
      if (!parsed) return;

      const key     = rangeKey(parsed.start, parsed.end);
      // 42日（6週間）= 月表示リクエストの識別
      const isMonth = parsed.end === P.addDaysIso(parsed.start, 42);
      const waiting = pendingKey !== null;
      const matches = waiting && key === pendingKey;

      // ── バルク取得（初回 or 年拡張）の完了 ──
      if (matches && bulkFetching) {
        bulkFetching  = false;
        pendingKey    = null;
        loading       = false;

        const items = Array.isArray(d.items) ? d.items : [];
        const kind  = bulkFetchKind;
        bulkFetchKind = null;

        if (kind === 'extend-next') {
          bulkItems  = mergeCalItemLists(bulkItems, items);
          bulkParsed = { start: bulkParsed.start, end: parsed.end };
        } else if (kind === 'extend-prev') {
          bulkItems  = mergeCalItemLists(items, bulkItems);
          bulkParsed = { start: parsed.start, end: bulkParsed.end };
        } else {
          // 初回バルク: 空の場合は既存データを保持する
          bulkItems  = items.length
            ? items
            : (Array.isArray(lastItems) && lastItems.length ? [...lastItems] : items);
          bulkParsed     = parsed;
          clientDataMode = true;
        }

        // 年拡張完了後のビュー遷移を適用する
        if (pendingExtend) {
          if (pendingExtend.weekParams) weekParams = pendingExtend.weekParams;
          if (pendingExtend.monthRef)   monthRef   = pendingExtend.monthRef;
          pendingExtend = null;
        }

        // 拡張完了後はアニメなし（単純に高さ変化のみ）
        redrawFromClient({ enterAnim: false });
        setNavEnabled();
        return;
      }

      // クライアント集約後はポータル由来の別レンジ応答で再描画しない
      if (clientDataMode && bulkParsed) {
        storedUKbn = parsed.uKbn || storedUKbn;
        storePassive(parsed, isMonth);
        setNavEnabled();
        return;
      }

      // 自分のフェッチへの応答でない場合は補助保存のみ
      if ((waiting && !matches) || (!waiting && loading)) {
        storePassive(parsed, isMonth);
        return;
      }

      // ── 自分のフェッチへの応答: 描画する ──
      pendingKey = null;
      loading    = false;

      storeFromParsed(parsed, isMonth);

      const items = Array.isArray(d.items) ? d.items : [];
      lastItems   = items;
      lastParsed  = parsed;

      P.clearCalBodyLoadingAttrs(els.body);
      redraw(items, parsed, { enterAnim: false });

      // 初回描画後にバックグラウンドでバルク取得を開始する
      setTimeout(queueBulkYearFetch, 0);
    }

    // ────────────────────────────────────────────
    // 公開 API: 設定変更後の再描画
    // ────────────────────────────────────────────

    /** 空パネルの表示・非表示を現在のデータで再判定する（設定変更後に呼ぶ） */
    function applyEmptyVisibility() {
      if (!hideWhenEmpty || !els.panel || lastParsed === null) return;
      // 設定変更による再描画はアニメなし
      if (clientDataMode && bulkParsed) redrawFromClient({ enterAnim: false });
      else redraw(lastItems ?? [], lastParsed, { enterAnim: false });
    }

    /** 講義リンク先（シラバス / King LMS）切替後に再描画する */
    function refreshCalLinks() {
      if (lastParsed === null) return;
      // リンク変更による再描画はアニメなし
      if (clientDataMode && bulkParsed) redrawFromClient({ enterAnim: false });
      else redraw(lastItems ?? [], lastParsed, { enterAnim: false });
    }

    // ────────────────────────────────────────────
    // 公開 API
    // ────────────────────────────────────────────

    return { wireNav, processMessage, applyEmptyVisibility, refreshCalLinks };
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  P.createCalendarController = createCalendarController;

})(typeof globalThis !== 'undefined' ? globalThis : window);
