/**
 * カレンダーのアニメーション・DOM 操作ユーティリティ。
 * スワイプ・フェードイン・高さアニメーションと、それを支える transition 待機ヘルパーを提供する。
 */

import { setHtml } from '../../lib/dom';

// ─── アクセシビリティ ─────────────────────────────────────────────────────

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ─── レイアウトタイミング ─────────────────────────────────────────────────

/** 2 フレーム後に実行（強制レイアウト後に transition を開始するため） */
export function afterLayout(fn: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

// ─── transition / animation 待機 ─────────────────────────────────────────

export function waitForTransition(
  el: Element,
  propertyName: string,
  callback: () => void,
  maxMs = 400,
): { cancel: () => void } {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.removeEventListener('transitionend', handler);
    clearTimeout(fallback);
    callback();
  };
  const handler: EventListener = (ev: Event) => {
    if (!(ev instanceof TransitionEvent)) return;
    if (ev.target !== el) return;
    if (propertyName && ev.propertyName !== propertyName) return;
    finish();
  };
  el.addEventListener('transitionend', handler);
  const fallback = setTimeout(finish, maxMs);
  return { cancel: finish };
}

export function waitForAnimation(el: Element, callback: () => void, maxMs = 500): { cancel: () => void } {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.removeEventListener('animationend', handler);
    clearTimeout(fallback);
    callback();
  };
  const handler: EventListener = (ev: Event) => {
    if (!(ev instanceof AnimationEvent)) return;
    if (ev.target !== el) return;
    finish();
  };
  el.addEventListener('animationend', handler);
  const fallback = setTimeout(finish, maxMs);
  return { cancel: finish };
}

// ─── ローディング属性のクリア ─────────────────────────────────────────────

/**
 * calBody の data-cal-loading / data-cal-mode / minHeight をクリアする。
 * ローディング中に仮設定した最低高さを解除するために呼ぶ。
 */
export function clearCalBodyLoadingAttrs(mount: HTMLElement | null | undefined): void {
  if (!mount) return;
  delete mount.dataset.calLoading;
  delete mount.dataset.calMode;
  mount.style.minHeight = '';
}

// ─── スワイプアニメーション ───────────────────────────────────────────────

/**
 * 前週/次週ナビゲーション時のスライドアニメーション。
 * oldHtml → newHtml をスライドトランジションで切り替える。
 */
export function applyCalSwipe(
  bodyEl: HTMLElement | null,
  dir: 'prev' | 'next',
  oldHtml: string,
  newHtml: string,
  onDone?: () => void,
): void {
  const done = () => onDone?.();
  if (!bodyEl) { done(); return; }

  if (prefersReducedMotion()) {
    setHtml(bodyEl, newHtml);
    done();
    return;
  }

  const trackClass  = dir === 'next' ? 'p-cal-swipe-track p-cal-swipe--next' : 'p-cal-swipe-track p-cal-swipe--prev';
  const firstCell   = dir === 'next' ? oldHtml : newHtml;
  const secondCell  = dir === 'next' ? newHtml : oldHtml;

  setHtml(bodyEl,
    `<div class="p-cal-swipe-viewport"><div class="${trackClass}">`
    + `<div class="p-cal-swipe-cell">${firstCell}</div>`
    + `<div class="p-cal-swipe-cell">${secondCell}</div>`
    + '</div></div>');

  const track = bodyEl.querySelector('.p-cal-swipe-track');
  if (!track) { setHtml(bodyEl, newHtml); done(); return; }

  waitForTransition(track, 'transform', () => {
    setHtml(bodyEl, newHtml);
    done();
  }, 500);

  afterLayout(() => track.classList.add('is-mid'));
}

// ─── モード切替アニメーション ─────────────────────────────────────────────

/**
 * 週/月切替時のフェードインアニメーションを再生する。
 * setHtml の直後（ブラウザの初回ペイント前）に呼ぶこと。
 * animation-fill-mode: both により、クラス付与と同時に from キーフレーム（opacity:0）が適用されるため
 * グリッドが一瞬表示されてから消えるフリッカーが起きない。afterLayout は不要。
 */
export function playCalModeEnterAnim(bodyEl: HTMLElement | null): void {
  if (!bodyEl || prefersReducedMotion()) return;
  const el = bodyEl.querySelector('.p-cal-grid') ?? bodyEl.querySelector('.p-empty');
  if (!el || !bodyEl.contains(el)) return;
  el.classList.add('p-cal-mode-swap-in');
  const { cancel } = waitForAnimation(el, () => {
    el.classList.remove('p-cal-mode-swap-in');
  }, 500);
  setTimeout(() => { if (!document.contains(el)) cancel(); }, 600);
}

// ─── 高さアニメーション ───────────────────────────────────────────────────

/**
 * HTML をセットしながら高さをスムーズにアニメーションさせる。
 * 高さの差が 3px 未満のときはアニメーションをスキップする。
 */
export function setCalBodyHtmlSmooth(
  el: HTMLElement | null,
  newHtml: string,
  onDone?: () => void,
  opts?: { playEnterAnim?: boolean },
): void {
  if (!el) { onDone?.(); return; }

  if (prefersReducedMotion()) {
    setHtml(el, newHtml);
    onDone?.();
    return;
  }

  const h0 = Math.max(1, Math.round(el.getBoundingClientRect().height));
  setHtml(el, newHtml);
  // フェードイン開始は setHtml の直後（初回ペイント前）。done() の後では遅すぎてフリッカーが出る。
  if (opts?.playEnterAnim) playCalModeEnterAnim(el);
  const h1 = Math.max(1, Math.round(el.getBoundingClientRect().height));

  if (Math.abs(h0 - h1) < 3) { onDone?.(); return; }

  el.style.transition = '';
  el.style.minHeight  = `${h0}px`;

  afterLayout(() => {
    // cubic-bezier(0.33, 1, 0.32, 1) は「勢いよく伸びてぴたっと止まる」ease-out 系カーブ。
    el.style.transition = 'min-height 0.42s cubic-bezier(0.33, 1, 0.32, 1)';
    el.style.minHeight  = `${h1}px`;
  });

  // 550ms = transition 時間 420ms + バッファ 130ms。transitionend が来なかった場合のフォールバック。
  waitForTransition(el, 'min-height', () => {
    el.style.minHeight  = '';
    el.style.transition = '';
    onDone?.();
  }, 550);
}
