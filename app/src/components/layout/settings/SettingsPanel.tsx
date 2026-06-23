/**
 * 設定パネルコンポーネント。
 * ヘッダーの「設定」ボタンの直下に表示されるポップオーバー形式のダイアログ。
 * カラーテーマ、（ポータル時）ホームの装飾・表示設定、Web メール、フィードバック（.env で設定したときのみフォーム・Discord）、（Home2 時）チェンジログ、
 * バージョン表記などをまとめるパネル。表示設定内の操作は案内再表示 → チェンジログ → King LMS 再取得の順。
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
import type { Settings } from '../../../context/settings';
import { readExtensionVersion } from '../../../lib/extension-version';
import { CHANGELOG_JSON_URL, PORTAL_DOM } from '../../../shared/constants';
import { useExtensionUpdateAvailable } from '../../../hooks/useExtensionUpdateAvailable';
import { useI18n } from '../../../i18n';
import { parseChangelogJson, type ParsedChangelogRelease } from './settings-changelog';
import { SettingsChangelogModal } from './SettingsChangelogModal';
import {
  SettingsFeedbackSection,
  SettingsHome2ChangelogSection,
  SettingsLanguageSection,
  SettingsPortalOnlySections,
  SettingsThemeSection,
  SettingsWebMailSection,
} from './SettingsPanelSections';

const extensionVersion = readExtensionVersion();

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
  /** Home2 Mail ではカラーテーマとバージョンのみ */
  variant?: 'portal' | 'home2';
}

export interface SettingsPanelHandle {
  /** 閉じるアニメーションを開始する（ヘッダーの設定ボタンから呼ばれる） */
  requestClose: () => void;
}

// ─── コンポーネント ────────────────────────────────────────────────────────

export const SettingsPanel = forwardRef<SettingsPanelHandle, SettingsPanelProps>(
  function SettingsPanel({
    popoverSurfaceRef,
    isOpen,
    settings,
    onClose,
    onThemeChange,
    onSettingChange,
    onReplayGuidedTour,
    variant = 'portal',
  }, ref) {
    const { t } = useI18n();
    const { latestVersion, updateAvailable } = useExtensionUpdateAvailable();
    const popRef  = useRef<HTMLDivElement>(null);
    const changelogCloseRef = useRef<HTMLButtonElement>(null);
    const changelogModalRootRef = useRef<HTMLDivElement>(null);
    const changelogFetchGenRef = useRef(0);
    const [closing, setClosing] = useState(false);
    const [changelogModalOpen, setChangelogModalOpen] = useState(false);
    const [changelogModalClosing, setChangelogModalClosing] = useState(false);
    const [changelogLoading, setChangelogLoading] = useState(false);
    const [changelogErr, setChangelogErr] = useState<string | null>(null);
    const [changelogList, setChangelogList] = useState<ParsedChangelogRelease[] | null>(null);

    const resetChangelogModal = useCallback(() => {
      changelogFetchGenRef.current += 1;
      setChangelogModalOpen(false);
      setChangelogModalClosing(false);
      setChangelogLoading(false);
      setChangelogErr(null);
      setChangelogList(null);
    }, []);

    const fetchChangelog = useCallback(() => {
      const gen = ++changelogFetchGenRef.current;
      setChangelogLoading(true);
      setChangelogErr(null);
      void fetch(CHANGELOG_JSON_URL, { method: 'GET', cache: 'no-store' })
        .then(async (r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json() as unknown;
        })
        .then((raw) => {
          if (changelogFetchGenRef.current !== gen) return;
          const parsed = parseChangelogJson(raw);
          if (!parsed) {
            setChangelogErr(t.settings.changelogFormatError);
            setChangelogList(null);
            return;
          }
          setChangelogList(parsed);
        })
        .catch(() => {
          if (changelogFetchGenRef.current !== gen) return;
          setChangelogErr(t.settings.changelogFetchError);
          setChangelogList(null);
        })
        .finally(() => {
          if (changelogFetchGenRef.current !== gen) return;
          setChangelogLoading(false);
        });
    }, [t]);

    const openChangelogModal = useCallback(() => {
      setChangelogModalClosing(false);
      setChangelogModalOpen(true);
      setChangelogList(null);
      setChangelogErr(null);
      fetchChangelog();
    }, [fetchChangelog]);

    /** フェードアウト後に `resetChangelogModal` で DOM を外す */
    const requestCloseChangelogModal = useCallback(() => {
      if (!changelogModalOpen || changelogModalClosing) return;
      setChangelogModalClosing(true);
    }, [changelogModalOpen, changelogModalClosing]);

    useEffect(() => {
      if (!changelogModalClosing) return;
      const el = changelogModalRootRef.current;
      const finish = () => {
        resetChangelogModal();
      };
      if (!el) {
        finish();
        return;
      }
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
    }, [changelogModalClosing, resetChangelogModal]);

    useEffect(() => {
      if (!isOpen) resetChangelogModal();
    }, [isOpen, resetChangelogModal]);

    useLayoutEffect(() => {
      if (!changelogModalOpen || changelogModalClosing) return;
      const btn = changelogCloseRef.current;
      if (btn) btn.focus();
    }, [changelogModalOpen, changelogModalClosing]);

    // 閉じるアニメーションを開始する（外部からも呼べるように ref 経由で公開）
    const requestClose = useCallback(() => {
      resetChangelogModal();
      if (!isOpen || closing) return;
      setClosing(true);
    }, [isOpen, closing, resetChangelogModal]);

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
      const sel = `#${PORTAL_DOM.overlayRoot}`;
      const root = (popRef.current?.closest(sel) ?? document.getElementById(PORTAL_DOM.overlayRoot)) as HTMLElement | null;
      if (!root) return;
      function onPointerDown(e: PointerEvent) {
        const t = e.target as Node;
        if (popRef.current?.contains(t)) return;
        if (document.getElementById('p-changelog-modal-root')?.contains(t)) return;
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

    // Escape キー：チェンジログモーダル優先で閉じる → 設定パネル
    useEffect(() => {
      if (!isOpen) return;
      function onKeyDown(e: KeyboardEvent) {
        if (e.key !== 'Escape') return;
        if (changelogModalClosing) return;
        if (changelogModalOpen) {
          e.preventDefault();
          requestCloseChangelogModal();
          return;
        }
        requestClose();
      }
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, changelogModalOpen, changelogModalClosing, requestCloseChangelogModal, requestClose]);

    const overlayEl = typeof document !== 'undefined'
      ? document.getElementById(PORTAL_DOM.overlayRoot)
      : null;

    const changelogModalMounted = changelogModalOpen || changelogModalClosing;
    const changelogModal = (
      <SettingsChangelogModal
        overlayEl={overlayEl}
        mounted={changelogModalMounted}
        closing={changelogModalClosing}
        loading={changelogLoading}
        err={changelogErr}
        list={changelogList}
        modalRootRef={changelogModalRootRef}
        closeButtonRef={changelogCloseRef}
        onRequestClose={requestCloseChangelogModal}
      />
    );

    return (
      <>
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
          <h2 id="p-settings-heading">{t.settings.title}</h2>

          {updateAvailable && latestVersion && extensionVersion ? (
            <div className="p-settings-update-callout" role="status" aria-live="polite">
              <p className="p-settings-update-callout-title">{t.settings.updateAvailableTitle}</p>
              <p className="p-settings-update-callout-body">
                {t.settings.updateAvailableBody(extensionVersion, latestVersion)}
              </p>
              <p className="p-settings-update-callout-hint">{t.settings.updateAvailableHint}</p>
            </div>
          ) : null}

          <SettingsLanguageSection settings={settings} onSettingChange={onSettingChange} />

          <SettingsThemeSection settings={settings} onThemeChange={onThemeChange} />

          {variant === 'portal' ? (
            <SettingsPortalOnlySections
              settings={settings}
              onSettingChange={onSettingChange}
              onReplayGuidedTour={onReplayGuidedTour}
              onOpenChangelog={openChangelogModal}
            />
          ) : null}

          <SettingsWebMailSection
            settings={settings}
            variant={variant}
            onSettingChange={onSettingChange}
          />

          <SettingsFeedbackSection />

          {variant === 'home2' ? (
            <SettingsHome2ChangelogSection onOpenChangelog={openChangelogModal} />
          ) : null}

          {extensionVersion ? (
            <div className="p-settings-version-block">
              <p className="p-settings-version" role="note">
                {t.settings.version(extensionVersion)}
              </p>
            </div>
          ) : null}
        </div>
      </div>
      {changelogModal}
      </>
    );
  },
);
