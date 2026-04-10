/**
 * トースト通知コンポーネントとそのカスタムフック。
 */

import { useState, useCallback, useRef } from 'react';

const DURATION_MS       = 3200;
const CLOSE_FALLBACK_MS = 420;

// ─── フック ───────────────────────────────────────────────────────────────

interface ToastState {
  message:   string;
  placement: 'bottom' | 'top';
  visible:   boolean;
  closing:   boolean;
}

export function useToast() {
  const [toast, setToast]  = useState<ToastState>({ message: '', placement: 'bottom', visible: false, closing: false });
  const hideTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelAnimRef      = useRef<(() => void) | null>(null);

  const show = useCallback((msg: string, opts?: { placement?: 'bottom' | 'top' }) => {
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    if (cancelAnimRef.current) { cancelAnimRef.current(); cancelAnimRef.current = null; }

    setToast({ message: msg, placement: opts?.placement ?? 'bottom', visible: true, closing: false });

    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        setToast((prev) => ({ ...prev, visible: false, closing: false }));
        return;
      }
      setToast((prev) => ({ ...prev, closing: true }));
      const fallback = setTimeout(() => {
        cancelAnimRef.current = null;
        setToast((prev) => ({ ...prev, visible: false, closing: false }));
      }, CLOSE_FALLBACK_MS);
      cancelAnimRef.current = () => clearTimeout(fallback);
    }, DURATION_MS);
  }, []);

  function onAnimationEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.animationName !== 'p-toast-out' && e.animationName !== 'p-toast-out-top') return;
    if (cancelAnimRef.current) { cancelAnimRef.current(); cancelAnimRef.current = null; }
    setToast((prev) => ({ ...prev, visible: false, closing: false }));
  }

  return { toast, show, onAnimationEnd };
}

// ─── クリップボード ───────────────────────────────────────────────────────

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
  }
  // フォールバック: textarea 経由
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// ─── コンポーネント ────────────────────────────────────────────────────────

interface ToastProps {
  toast:          ToastState;
  onAnimationEnd: (e: React.AnimationEvent<HTMLDivElement>) => void;
}

export function Toast({ toast, onAnimationEnd }: ToastProps) {
  if (!toast.visible) return null;
  const cls = [
    'p-toast',
    toast.placement === 'top' ? 'p-toast--top'     : '',
    toast.closing             ? 'p-toast--closing' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      id="p-toast"
      className={cls}
      role="status"
      aria-live="polite"
      onAnimationEnd={onAnimationEnd}
    >
      {toast.message}
    </div>
  );
}
