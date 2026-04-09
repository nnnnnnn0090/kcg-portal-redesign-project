/**
 * ui/animation.js — アニメーション・トランジション待機ユーティリティ
 *
 * ロード順: document_idle（api/urls.js の後）。
 *
 * このモジュールはアニメーション関連の低レベルな処理を一元化する。
 * 各ユーティリティは「イベント待機 + フォールバックタイマー」の
 * 組み合わせでアニメーション完了を確実に検知する。
 *
 * 【設計の背景】
 * transitionend / animationend イベントは:
 *   - reduced-motion 設定だと発火しない場合がある
 *   - 要素が DOM から取り除かれると発火しない
 *   - CSS が適用されていない場合は発火しない
 * そのため必ずフォールバックタイマーを設ける。
 * また「done フラグ」で二重実行を防ぐ。
 *
 * 公開: P.anim.prefersReducedMotion, P.anim.afterLayout,
 *        P.anim.waitForTransition, P.anim.waitForAnimation,
 *        P.anim.applyCalSwipe, P.anim.playCalModeEnterAnim,
 *        P.anim.setCalBodyHtmlSmooth
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // ────────────────────────────────────────────
  // 基本ユーティリティ
  // ────────────────────────────────────────────

  /**
   * ユーザーが「動きを減らす」設定をしているか判定する。
   * アニメーションをスキップする判断に使う。
   * @returns {boolean}
   */
  function prefersReducedMotion() {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * 2フレーム後に fn を実行する。
   * レイアウトが確定した後のサイズ取得や CSS クラス付与に使う。
   * （1フレームだけだと Chrome でトランジションが始まらないことがある）
   *
   * @param {() => void} fn
   */
  function afterLayout(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  }

  // ────────────────────────────────────────────
  // transitionend 待機
  // ────────────────────────────────────────────

  /**
   * 指定要素の CSS トランジション完了を待って callback を呼ぶ。
   *
   * @param {Element} el              - 対象要素
   * @param {string} propertyName     - 待機する CSS プロパティ名（'opacity' など）
   * @param {() => void} callback     - 完了時コールバック（一度だけ呼ばれる）
   * @param {number} [maxMs=400]      - フォールバックタイムアウト（ミリ秒）
   * @returns {{ cancel: () => void }} cancel() で即座に callback を呼べる
   */
  function waitForTransition(el, propertyName, callback, maxMs = 400) {
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener('transitionend', handler);
      clearTimeout(fallback);
      callback();
    };

    const handler = (ev) => {
      if (ev.target !== el) return;
      if (propertyName && ev.propertyName !== propertyName) return;
      finish();
    };

    el.addEventListener('transitionend', handler);
    const fallback = setTimeout(finish, maxMs);

    return { cancel: finish };
  }

  // ────────────────────────────────────────────
  // animationend 待機
  // ────────────────────────────────────────────

  /**
   * 指定要素の CSS アニメーション完了を待って callback を呼ぶ。
   *
   * @param {Element} el              - 対象要素
   * @param {() => void} callback     - 完了時コールバック（一度だけ呼ばれる）
   * @param {number} [maxMs=500]      - フォールバックタイムアウト（ミリ秒）
   * @returns {{ cancel: () => void }}
   */
  function waitForAnimation(el, callback, maxMs = 500) {
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener('animationend', handler);
      clearTimeout(fallback);
      callback();
    };

    const handler = (ev) => {
      // 子要素のアニメーションは無視する
      if (ev.target !== el) return;
      finish();
    };

    el.addEventListener('animationend', handler);
    const fallback = setTimeout(finish, maxMs);

    return { cancel: finish };
  }

  // ────────────────────────────────────────────
  // カレンダー: 横スライドアニメーション
  // ────────────────────────────────────────────

  /**
   * カレンダーグリッドを横スライドで切り替える。
   * reduced-motion の場合はアニメなしで即座に差し替える。
   *
   * @param {Element} bodyEl           - カレンダー本体（p-cal-body 相当）
   * @param {'prev' | 'next'} dir      - ナビゲーション方向
   * @param {string} oldHtml           - 現在表示中のグリッド HTML
   * @param {string} newHtml           - 次に表示するグリッド HTML
   * @param {() => void} [onDone]      - 完了後コールバック
   */
  function applyCalSwipe(bodyEl, dir, oldHtml, newHtml, onDone) {
    const done = () => onDone?.();

    if (!bodyEl) { done(); return; }

    if (prefersReducedMotion()) {
      P.setHtml(bodyEl, newHtml);
      done();
      return;
    }

    const trackClass = dir === 'next'
      ? 'p-cal-swipe-track p-cal-swipe--next'
      : 'p-cal-swipe-track p-cal-swipe--prev';
    const firstCell  = dir === 'next' ? oldHtml : newHtml;
    const secondCell = dir === 'next' ? newHtml : oldHtml;

    P.setHtml(bodyEl,
      `<div class="p-cal-swipe-viewport"><div class="${trackClass}">`
      + `<div class="p-cal-swipe-cell">${firstCell}</div>`
      + `<div class="p-cal-swipe-cell">${secondCell}</div>`
      + `</div></div>`);

    const track = bodyEl.querySelector('.p-cal-swipe-track');
    if (!track) {
      P.setHtml(bodyEl, newHtml);
      done();
      return;
    }

    // トランジション完了後に新しい HTML で置き換える
    waitForTransition(track, 'transform', () => {
      P.setHtml(bodyEl, newHtml);
      done();
    }, 500);

    // 2フレーム後にクラスを追加してトランジションを開始する
    afterLayout(() => track.classList.add('is-mid'));
  }

  // ────────────────────────────────────────────
  // カレンダー: モード切替入場アニメーション
  // ────────────────────────────────────────────

  /**
   * カレンダーのモード切替（週↔月）後に入場アニメを 1 回だけ再生する。
   * グリッドまたは空メッセージ要素に p-cal-mode-swap-in クラスを付与する。
   *
   * @param {Element} bodyEl - カレンダー本体要素
   */
  function playCalModeEnterAnim(bodyEl) {
    if (!bodyEl || prefersReducedMotion()) return;

    afterLayout(() => {
      const el = bodyEl.querySelector('.p-cal-grid') || bodyEl.querySelector('.p-empty');
      if (!el || !bodyEl.contains(el)) return;

      el.classList.add('p-cal-mode-swap-in');

      const { cancel } = waitForAnimation(el, () => {
        el.classList.remove('p-cal-mode-swap-in');
      }, 500);

      // 要素が DOM から外れた場合も確実にクリーンアップする
      setTimeout(() => {
        if (!document.contains(el)) cancel();
      }, 600);
    });
  }

  // ────────────────────────────────────────────
  // カレンダー: 高さスムーズ変化
  // ────────────────────────────────────────────

  /**
   * カレンダー本体の HTML を差し替えつつ、高さをスムーズに変化させる。
   * コンテンツ切り替え時のガクつきを防ぐ。
   *
   * @param {Element} el            - カレンダー本体要素
   * @param {string} newHtml        - 新しいコンテンツ HTML
   * @param {() => void} [onDone]   - 高さアニメーション完了後のコールバック
   */
  function setCalBodyHtmlSmooth(el, newHtml, onDone) {
    const done = () => onDone?.();

    if (!el) { done(); return; }

    if (prefersReducedMotion()) {
      P.setHtml(el, newHtml);
      done();
      return;
    }

    const h0 = Math.max(1, Math.round(el.getBoundingClientRect().height));
    P.setHtml(el, newHtml);
    const h1 = Math.max(1, Math.round(el.getBoundingClientRect().height));

    // 高さの差が小さい場合はアニメ不要
    if (Math.abs(h0 - h1) < 3) {
      done();
      return;
    }

    // 現在の高さから新しい高さへスムーズに変化させる
    el.style.transition = '';
    el.style.minHeight  = `${h0}px`;

    afterLayout(() => {
      el.style.transition = 'min-height 0.42s cubic-bezier(0.33, 1, 0.32, 1)';
      el.style.minHeight  = `${h1}px`;
    });

    waitForTransition(el, 'min-height', () => {
      el.style.minHeight  = '';
      el.style.transition = '';
      done();
    }, 550);
  }

  // ────────────────────────────────────────────
  // グローバルに公開（P.anim 名前空間）
  // ────────────────────────────────────────────

  P.anim = {
    prefersReducedMotion,
    afterLayout,
    waitForTransition,
    waitForAnimation,
    applyCalSwipe,
    playCalModeEnterAnim,
    setCalBodyHtmlSmooth,
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
