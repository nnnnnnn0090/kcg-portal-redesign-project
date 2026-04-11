/**
 * Windows のマウスホイール等（DOM_DELTA_LINE や大きな段階的 delta）で縦スクロールが
 * カクついて見えるのを抑える。トラックパッドの細かい delta には干渉しない。
 * prefers-reduced-motion: reduce では何もしない。
 */

const WIN_UA = /Windows/i.test(navigator.userAgent);

function wantsDiscreteWheelSmoothing(e: WheelEvent): boolean {
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) return true;
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) return true;
  if (e.deltaMode === WheelEvent.DOM_DELTA_PIXEL && WIN_UA) {
    const d = e.shiftKey ? e.deltaX : e.deltaY;
    if (Math.abs(d) >= 48) return true;
  }
  return false;
}

/** ホイールの既定スクロールがこのルート自身に効くときだけ true（ネストした overflow は除外） */
function wheelScrollsRootOnly(e: WheelEvent, root: HTMLElement): boolean {
  if (e.ctrlKey || e.metaKey) return false;

  const rawDy = e.shiftKey ? e.deltaX : e.deltaY;
  if (rawDy === 0) return false;

  let n: Element | null = e.target instanceof Element ? e.target : null;
  while (n && n !== root) {
    if (!(n instanceof HTMLElement)) {
      n = n.parentElement;
      continue;
    }
    const st = getComputedStyle(n);
    const oy = st.overflowY;
    const scrollableY =
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') && n.scrollHeight > n.clientHeight + 1;
    if (scrollableY) {
      const maxTop = n.scrollHeight - n.clientHeight;
      if (rawDy > 0 && n.scrollTop < maxTop - 0.5) return false;
      if (rawDy < 0 && n.scrollTop > 0.5) return false;
    }
    n = n.parentElement;
  }

  if (root.scrollHeight <= root.clientHeight + 1) return false;
  const maxTop = root.scrollHeight - root.clientHeight;
  if (rawDy > 0 && root.scrollTop >= maxTop - 0.5) return false;
  if (rawDy < 0 && root.scrollTop <= 0.5) return false;
  return true;
}

function primaryDeltaPixels(e: WheelEvent, root: HTMLElement): number {
  const dy = e.shiftKey ? e.deltaX : e.deltaY;
  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    const lh = parseFloat(getComputedStyle(root).lineHeight);
    const line = Number.isFinite(lh) && lh > 0 ? lh : 18;
    return dy * line * 1.25;
  }
  if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return dy * root.clientHeight * 0.88;
  }
  return dy;
}

/**
 * #portal-overlay など縦スクロールのルートに wheel 補間を付与する。
 * @returns 解除関数
 */
export function attachSmoothOverlayWheelScroll(root: HTMLElement): () => void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return () => {};

  let vel = 0;
  let rafId = 0;

  const friction = 0.9;
  const minAbs = 0.35;
  const velCap = 95;
  const impulse = 0.11;

  function step() {
    rafId = 0;
    if (Math.abs(vel) < minAbs) {
      vel = 0;
      return;
    }

    const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
    const next = root.scrollTop + vel;

    if (next < 0) {
      root.scrollTop = 0;
      vel *= 0.35;
    } else if (next > maxScroll) {
      root.scrollTop = maxScroll;
      vel *= 0.35;
    } else {
      root.scrollTop = next;
      vel *= friction;
    }

    if (Math.abs(vel) >= minAbs) rafId = requestAnimationFrame(step);
    else vel = 0;
  }

  function kick() {
    if (!rafId) rafId = requestAnimationFrame(step);
  }

  function onWheel(e: WheelEvent) {
    if (reduce.matches) return;
    if (!wantsDiscreteWheelSmoothing(e)) return;
    if (!wheelScrollsRootOnly(e, root)) return;

    e.preventDefault();

    const px = primaryDeltaPixels(e, root);
    const add = Math.max(-velCap, Math.min(velCap, px)) * impulse;
    vel += add;
    vel = Math.max(-velCap, Math.min(velCap, vel));
    kick();
  }

  root.addEventListener('wheel', onWheel, { passive: false });

  function onReduceChange() {
    if (!reduce.matches) return;
    vel = 0;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }
  reduce.addEventListener('change', onReduceChange);

  return () => {
    root.removeEventListener('wheel', onWheel);
    reduce.removeEventListener('change', onReduceChange);
    if (rafId) cancelAnimationFrame(rafId);
    vel = 0;
    rafId = 0;
  };
}
