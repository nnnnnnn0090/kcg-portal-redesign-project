/**
 * 設定パネルコンポーネント。
 * ヘッダーの「設定」ボタンの直下に表示されるポップオーバー形式のダイアログ。
 * テーマ選択・表示設定・King LMS コース一覧の再取得・案内チュートリアルの再表示を提供する。
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type Ref,
} from 'react';
import { THEMES } from '../../themes';
import type { Settings } from '../../context/settings';
import { beginKingLmsCourseListSync } from '../../lib/king-lms-course-sync';

// ─── 型 ───────────────────────────────────────────────────────────────────

interface SettingsPanelProps {
  /** ポップオーバー外枠 DOM（Escape 連携などで他フックから参照する） */
  popoverSurfaceRef?: Ref<HTMLDivElement | null>;
  isOpen:          boolean;
  settings:        Settings;
  onClose:         () => void;
  onThemeChange:   (name: string) => void;
  onSettingChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  /** 初回案内チュートリアルを先頭から再表示する */
  onReplayGuidedTour: () => void;
}

export interface SettingsPanelHandle {
  /** 閉じるアニメーションを開始する（ヘッダーの設定ボタンから呼ばれる） */
  requestClose: () => void;
}

// ─── コンポーネント ────────────────────────────────────────────────────────

export const SettingsPanel = forwardRef<SettingsPanelHandle, SettingsPanelProps>(
  function SettingsPanel({ popoverSurfaceRef, isOpen, settings, onClose, onThemeChange, onSettingChange, onReplayGuidedTour }, ref) {
    const popRef  = useRef<HTMLDivElement>(null);
    const [closing, setClosing] = useState(false);

    // 閉じるアニメーションを開始する（外部からも呼べるように ref 経由で公開）
    const requestClose = useCallback(() => {
      if (!isOpen || closing) return;
      setClosing(true);
    }, [isOpen, closing]);

    useImperativeHandle(ref, () => ({ requestClose }), [requestClose]);

    // isOpen が false になったら closing 状態をリセット
    useEffect(() => {
      if (!isOpen) setClosing(false);
    }, [isOpen]);

    // パネルが開いている間、右端が viewport からはみ出していれば left を補正する。
    // ウィンドウリサイズだけでなく、ヘッダー内の profile 名の表示/非表示で
    // 設定ボタン位置が変わった場合も ResizeObserver で検知して再計算する。
    useLayoutEffect(() => {
      if (!isOpen) return;
      const el = popRef.current;
      if (!el) return;
      function clamp() {
        el!.style.left = '';
        const overflow = el!.getBoundingClientRect().right - (window.innerWidth - 8);
        if (overflow > 0) el!.style.left = `-${overflow}px`;
      }
      clamp();
      window.addEventListener('resize', clamp);
      const headerActions = el.closest('.p-header-actions');
      const ro = headerActions ? new ResizeObserver(clamp) : null;
      ro?.observe(headerActions!);
      return () => {
        window.removeEventListener('resize', clamp);
        ro?.disconnect();
      };
    }, [isOpen]);

    // 閉じるアニメーション終了後に親へ通知
    useEffect(() => {
      if (!closing) return;
      const el = popRef.current;
      const finish = () => { setClosing(false); onClose(); };
      if (!el) { finish(); return; }

      // reduced-motion 環境では animationend が発火しないため 30ms でフォールバック。
      // 通常は CSS の閉じアニメーション（約 200ms）が終わる前に animationend が来るが、
      // 220ms はその保険タイムアウト。
      const ms = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 30 : 220;
      const timer = window.setTimeout(finish, ms);
      const onAnimEnd = (e: AnimationEvent) => {
        if (e.target !== el) return;
        window.clearTimeout(timer);
        el.removeEventListener('animationend', onAnimEnd);
        finish();
      };
      el.addEventListener('animationend', onAnimEnd);
      return () => {
        window.clearTimeout(timer);
        el.removeEventListener('animationend', onAnimEnd);
      };
    }, [closing, onClose]);

    // パネル外クリックで閉じる（設定ボタン自体はヘッダー側でトグル処理するため除外）
    useEffect(() => {
      if (!isOpen || closing) return;
      const root = (popRef.current?.closest('#portal-overlay') ?? document.getElementById('portal-overlay')) as HTMLElement | null;
      if (!root) return;
      function onPointerDown(e: PointerEvent) {
        const t = e.target as Node;
        if (popRef.current?.contains(t)) return;
        if (document.getElementById('p-open-settings')?.contains(t)) return;
        requestClose();
      }
      root.addEventListener('pointerdown', onPointerDown);
      return () => root.removeEventListener('pointerdown', onPointerDown);
    }, [isOpen, closing, requestClose]);

    function assignPopSurface(node: HTMLDivElement | null): void {
      popRef.current = node;
      const r = popoverSurfaceRef;
      if (r == null) return;
      if (typeof r === 'function') r(node);
      else (r as RefObject<HTMLDivElement | null>).current = node;
    }

    // Escape キーで閉じる
    useEffect(() => {
      if (!isOpen) return;
      function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') requestClose();
      }
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, requestClose]);

    return (
      <div
        ref={assignPopSurface}
        className={`p-settings-pop${closing ? ' is-closing' : ''}`}
        id="p-settings-pop"
        hidden={!isOpen && !closing}
        aria-hidden={!isOpen}
      >
        <div
          className="p-settings-dialog"
          id="p-settings-dialog"
          role="dialog"
          aria-modal={false}
          aria-labelledby="p-settings-heading"
          tabIndex={-1}
        >
          <h2 id="p-settings-heading">設定</h2>

          {/* ── テーマ選択 ────────────────────────────────────── */}
          <div className="p-settings-section">
            <div className="p-settings-section-title">カラーテーマ</div>
            <div className="p-theme-picker" id="p-theme-picker">
              {Object.entries(THEMES).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  className={`p-theme-btn${settings.theme === key ? ' is-active' : ''}`}
                  data-theme={key}
                  onClick={() => onThemeChange(key)}
                >
                  <span className="p-theme-btn-swatches" aria-hidden>
                    <span className="p-theme-btn-swatch" style={{ background: meta.bg }} />
                    <span className="p-theme-btn-swatch" style={{ background: meta.accent }} />
                  </span>
                  <span className="p-theme-btn-label">{meta.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── ホームの装飾 ─────────────────────────────────── */}
          <div className="p-settings-section">
            <div className="p-settings-section-title">ホームの装飾</div>
            <label className="p-settings-row">
              <input
                type="checkbox"
                checked={settings.showKogiCalMascot}
                onChange={(e) => onSettingChange('showKogiCalMascot', e.target.checked)}
              />
              <span>授業カレンダーにマスコットを表示する</span>
            </label>
          </div>

          {/* ── 表示設定 ──────────────────────────────────────── */}
          <div className="p-settings-section">
            <div className="p-settings-section-title">表示設定</div>

            <label className="p-settings-row">
              <input
                type="checkbox"
                checked={settings.kinoEmptyForce}
                onChange={(e) => onSettingChange('kinoEmptyForce', e.target.checked)}
              />
              <span>お知らせを、内容がなくても表示する</span>
            </label>

            <label className="p-settings-row">
              <input
                type="checkbox"
                checked={settings.hoshuCalForce}
                onChange={(e) => onSettingChange('hoshuCalForce', e.target.checked)}
              />
              <span>補修カレンダーを、予定がなくても表示する</span>
            </label>

            <label className="p-settings-row">
              <input
                type="checkbox"
                checked={settings.campusCalForce}
                onChange={(e) => onSettingChange('campusCalForce', e.target.checked)}
              />
              <span>キャンパスカレンダーを、予定がなくても表示する</span>
            </label>

            <label className="p-settings-row">
              <input
                type="checkbox"
                checked={settings.hideProfileName}
                onChange={(e) => onSettingChange('hideProfileName', e.target.checked)}
              />
              <span>ヘッダーに名前を表示しない</span>
            </label>

            <div className="p-settings-row p-settings-row-actions p-settings-king-lms-sync">
              <button
                type="button"
                className="p-settings-resync-btn"
                onClick={() => void beginKingLmsCourseListSync({ toastQuiet: true })}
              >
                コース一覧を再取得
              </button>
              <p className="p-settings-hint">
                講義のクリックで King LMS のコースへ移動するために使用します。一覧取得のため一度 King LMS へ移動します（終了後にポータルへ戻ります）。
              </p>
            </div>

            <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
              <button
                type="button"
                className="p-settings-tour-replay-btn"
                onClick={onReplayGuidedTour}
              >
                はじめの案内をもう一度見る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
