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
import { createPortal } from 'react-dom';
import { THEMES } from '../../themes';
import type { Settings } from '../../context/settings';
import { beginKingLmsCourseListSync } from '../../lib/king-lms-course-sync';
import { readExtensionVersion } from '../../lib/extension-version';
import {
  CHANGELOG_JSON_URL,
  EXTENSION_FEEDBACK_FORM_URL,
  PORTAL_COMMUNITY_DISCORD_INVITE_URL,
  PORTAL_DOM,
} from '../../shared/constants';

type ParsedChangelogRelease = {
  version:    string;
  date:       string;
  title:      string;
  highlights: string[];
  notes:      string[];
};

function parseChangelogJson(json: unknown): ParsedChangelogRelease[] | null {
  if (!json || typeof json !== 'object') return null;
  const releases = (json as { releases?: unknown }).releases;
  if (!Array.isArray(releases)) return null;
  const out: ParsedChangelogRelease[] = [];
  for (const item of releases) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const version = typeof r.version === 'string' ? r.version.trim() : '';
    if (!version) continue;
    const date = typeof r.date === 'string' ? r.date.trim() : '';
    const title = typeof r.title === 'string' ? r.title.trim() : '';
    const highlights = Array.isArray(r.highlights)
      ? r.highlights.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
    const notes = Array.isArray(r.notes)
      ? r.notes.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];
    out.push({ version, date, title, highlights, notes });
  }
  return out.length > 0 ? out : null;
}

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
            setChangelogErr('更新履歴の形式を読み取れませんでした。');
            setChangelogList(null);
            return;
          }
          setChangelogList(parsed);
        })
        .catch(() => {
          if (changelogFetchGenRef.current !== gen) return;
          setChangelogErr('更新履歴を取得できませんでした。ネットワークやサイト側の状態をご確認ください。');
          setChangelogList(null);
        })
        .finally(() => {
          if (changelogFetchGenRef.current !== gen) return;
          setChangelogLoading(false);
        });
    }, []);

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
    const changelogModal = changelogModalMounted && overlayEl
      ? createPortal(
        <div
          ref={changelogModalRootRef}
          id="p-changelog-modal-root"
          className={`p-changelog-modal-root${changelogModalClosing ? ' is-closing' : ''}`}
          role="presentation"
        >
          <button
            type="button"
            className="p-changelog-modal-backdrop"
            aria-label="閉じる"
            onClick={requestCloseChangelogModal}
          />
          <div
            className="p-changelog-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="p-changelog-modal-title"
          >
            <div className="p-changelog-modal-head">
              <h2 id="p-changelog-modal-title">更新履歴</h2>
              <button
                ref={changelogCloseRef}
                type="button"
                className="p-changelog-modal-close"
                aria-label="閉じる"
                onClick={requestCloseChangelogModal}
              >
                ×
              </button>
            </div>
            <div className="p-changelog-modal-body">
              {changelogLoading ? <p className="p-changelog-modal-status">読み込み中…</p> : null}
              {changelogErr ? (
                <p className="p-changelog-modal-status p-changelog-modal-status--error" role="alert">
                  {changelogErr}
                </p>
              ) : null}
              {!changelogLoading && changelogList && changelogList.length > 0 ? (
                <div className="p-settings-changelog-list">
                  {changelogList.map((rel) => (
                    <article key={rel.version} className="p-settings-changelog-rel">
                      <h3 className="p-settings-changelog-rel-heading">
                        {rel.version}
                        {rel.date ? ` · ${rel.date}` : ''}
                      </h3>
                      {rel.title ? <p className="p-settings-changelog-rel-title">{rel.title}</p> : null}
                      {rel.highlights.length > 0 ? (
                        <ul className="p-settings-changelog-ul">
                          {rel.highlights.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      ) : null}
                      {rel.notes.map((t, i) => (
                        <p key={`n-${rel.version}-${i}`} className="p-settings-changelog-note">
                          {t}
                        </p>
                      ))}
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        overlayEl,
      )
      : null;

    const feedbackFormUrl = EXTENSION_FEEDBACK_FORM_URL;
    const discordInviteUrl = PORTAL_COMMUNITY_DISCORD_INVITE_URL;
    const hasFeedbackForm = feedbackFormUrl.length > 0;
    const hasDiscordCommunity = discordInviteUrl.length > 0;
    const showFeedbackSection = hasFeedbackForm || hasDiscordCommunity;
    const feedbackSectionTitle = hasFeedbackForm && hasDiscordCommunity
      ? 'フィードバック・コミュニティ'
      : hasFeedbackForm
        ? 'フィードバック'
        : 'コミュニティ';

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

          {variant === 'portal' ? (
            <>
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
                    checked={settings.hideProfileName}
                    onChange={(e) => onSettingChange('hideProfileName', e.target.checked)}
                  />
                  <span>ヘッダーに名前を表示しない</span>
                </label>

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

                <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
                  <button
                    type="button"
                    className="p-settings-tour-replay-btn"
                    onClick={onReplayGuidedTour}
                  >
                    はじめの案内をもう一度見る
                  </button>
                </div>

                <div className="p-settings-row p-settings-row-actions p-settings-tour-replay p-settings-changelog-after-tour">
                  <button
                    type="button"
                    className="p-settings-tour-replay-btn"
                    onClick={openChangelogModal}
                  >
                    チェンジログを確認
                  </button>
                </div>

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
              </div>
            </>
          ) : null}

          <div className="p-settings-section">
            <div className="p-settings-section-title">Web メール</div>
            <label className="p-settings-row">
              <input
                type="checkbox"
                checked={settings.home2WebMailOverlay}
                onChange={(e) => {
                  const next = e.target.checked;
                  onSettingChange('home2WebMailOverlay', next);
                  if (variant === 'home2' && !next) window.location.reload();
                }}
              />
              <span>拡張のオーバーレイを表示する</span>
            </label>
            <p className="p-settings-hint">オフにしたあと反映するにはページを再読み込みしてください。</p>
          </div>

          {showFeedbackSection ? (
            <div className="p-settings-section">
              <div className="p-settings-section-title">{feedbackSectionTitle}</div>
              {hasFeedbackForm ? (
                <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
                  <a
                    className="p-settings-tour-replay-btn"
                    href={feedbackFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {hasDiscordCommunity ? 'バグ報告 / 機能リクエスト（フォーム）' : 'バグ報告 / 機能リクエスト'}
                  </a>
                </div>
              ) : null}
              {hasDiscordCommunity ? (
                <>
                  {hasFeedbackForm ? (
                    <p className="p-settings-hint p-settings-hint--tight">
                      Discord からもバグ報告・機能リクエストを受け付けています。
                    </p>
                  ) : null}
                  <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
                    <a
                      className="p-settings-tour-replay-btn p-settings-discord-btn"
                      href={discordInviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg
                        className="p-settings-discord-icon"
                        width={20}
                        height={20}
                        viewBox="0 0 24 24"
                        aria-hidden={true}
                        focusable="false"
                      >
                        <path
                          fill="currentColor"
                          d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                        />
                      </svg>
                      <span>Discord サーバーへ</span>
                    </a>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {variant === 'home2' ? (
            <div className="p-settings-section p-settings-section-changelog-only">
              <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
                <button
                  type="button"
                  className="p-settings-tour-replay-btn"
                  onClick={openChangelogModal}
                >
                  チェンジログを確認
                </button>
              </div>
            </div>
          ) : null}

          {extensionVersion ? (
            <p className="p-settings-version" role="note">
              バージョン {extensionVersion}
            </p>
          ) : null}
        </div>
      </div>
      {changelogModal}
      </>
    );
  },
);
