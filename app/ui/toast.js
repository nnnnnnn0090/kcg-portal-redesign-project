/**
 * ui/toast.js — トースト通知 + シェアボタン
 *
 * ロード順: document_idle（ui/animation.js の後）。
 *
 * 役割:
 *   1. 短時間表示のトースト通知（#p-toast）を管理する
 *   2. 拡張機能紹介ページの URL をクリップボードにコピーするボタンを配線する
 *
 * 公開: P.toast.show(msg, opts?), P.toast.wireShareButton()
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  // トースト表示時間（ミリ秒）
  const TOAST_DURATION_MS = 3200;
  const CLOSE_FALLBACK_MS = 420;

  /** @type {ReturnType<typeof setTimeout> | 0} */
  let hideTimer = 0;

  /** @type {(() => void) | null} */
  let cancelCloseAnim = null;

  function prefersReducedMotion() {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function finishHide(toastEl) {
    if (cancelCloseAnim) {
      cancelCloseAnim();
      cancelCloseAnim = null;
    }
    toastEl.hidden = true;
    toastEl.classList.remove('p-toast--top', 'p-toast--closing');
  }

  function startCloseAnimation(toastEl) {
    if (prefersReducedMotion()) {
      finishHide(toastEl);
      return;
    }
    toastEl.classList.add('p-toast--closing');
    let fallbackTid = 0;
    const onEnd = (e) => {
      if (e.target !== toastEl) return;
      if (e.animationName !== 'p-toast-out' && e.animationName !== 'p-toast-out-top') return;
      toastEl.removeEventListener('animationend', onEnd);
      if (fallbackTid) window.clearTimeout(fallbackTid);
      cancelCloseAnim = null;
      finishHide(toastEl);
    };
    toastEl.addEventListener('animationend', onEnd);
    fallbackTid = window.setTimeout(() => {
      toastEl.removeEventListener('animationend', onEnd);
      cancelCloseAnim = null;
      finishHide(toastEl);
    }, CLOSE_FALLBACK_MS);
    cancelCloseAnim = () => {
      window.clearTimeout(fallbackTid);
      toastEl.removeEventListener('animationend', onEnd);
    };
  }

  /**
   * トースト通知を表示する。
   * 表示中に再度呼ばれた場合はタイマーをリセットして延長する。
   *
   * @param {string} msg - 表示するメッセージ
   * @param {{ placement?: 'bottom' | 'top' }} [opts] - placement: 'top' でヘッダー下の上段表示
   */
  function show(msg, opts) {
    const toastEl = document.getElementById('p-toast');
    if (!toastEl) return;

    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
    }
    if (cancelCloseAnim) cancelCloseAnim();
    toastEl.classList.remove('p-toast--closing');

    const top = opts && opts.placement === 'top';
    toastEl.classList.toggle('p-toast--top', top);
    toastEl.textContent = msg;
    toastEl.hidden = false;

    hideTimer = window.setTimeout(() => {
      hideTimer = 0;
      startCloseAnimation(toastEl);
    }, TOAST_DURATION_MS);
  }

  // ────────────────────────────────────────────
  // クリップボードコピーヘルパー
  // ────────────────────────────────────────────

  /**
   * テキストをクリップボードにコピーする。
   * Clipboard API が使えない場合は textarea + execCommand にフォールバックする。
   *
   * @param {string} text
   * @returns {Promise<boolean>} 成功なら true
   */
  async function copyToClipboard(text) {
    // モダンな Clipboard API
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        // フォールバックへ
      }
    }

    // フォールバック: textarea + execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const success = document.execCommand('copy');
      document.body.removeChild(ta);
      return success;
    } catch (e) {
      return false;
    }
  }

  // ────────────────────────────────────────────
  // シェアボタン配線
  // ────────────────────────────────────────────

  /**
   * 拡張機能紹介 URL コピーボタン（#p-share-extension）にイベントを配線する。
   * boot.js が DOM 構築後に呼ぶ。
   */
  function wireShareButton() {
    const btn = document.getElementById('p-share-extension');
    const url = P.EXTENSION_PROMO_PAGE_URL;
    if (!btn || !url) return;

    btn.addEventListener('click', async () => {
      const ok = await copyToClipboard(url);
      show(ok ? '拡張機能のURLをコピーしました' : 'URLのコピーに失敗しました');
    });
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  P.toast = { show, wireShareButton };

})(typeof globalThis !== 'undefined' ? globalThis : window);
