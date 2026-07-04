/**
 * オーバーレイ上部のヘッダー（学ポータル / Home2 Web メール）。
 * ホスト DOM からナビ・プロフィール・ログアウトを取り込み、設定ポップオーバーを差し込む。
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Settings } from '../../context/settings';
import {
  HOME2_MAIL_DEFAULT_URL,
  HOME2_ORIGIN,
  HOME2_TOP_PAGE_URL,
  CLIENT_USER_ID_HEADER,
  COMMUNITY_ACCESS_URL,
  PORTAL_DOM,
  SK,
} from '../../shared/constants';
import storage from '../../lib/storage';
import { findHostLogoffAnchor, requestHostPortalLogoff } from '../../shared/host-logoff';
import { resolvePortalNavLabel } from '../../lib/portal-nav-labels';
import { useI18n } from '../../i18n';
import type { AppLanguage, I18nMessages } from '../../i18n/messages';
import { useExtensionUpdateAvailable } from '../../hooks/useExtensionUpdateAvailable';
import { CommunityActivityDrawer } from './CommunityActivityDrawer';
import { getOrCreateClientUserId } from '../../lib/client-user-id';

// ─── ナビゲーション型 ─────────────────────────────────────────────────────

interface NavLink {
  type: 'link';
  label: string;
  href: string;
  target?: string;
  title?: string;
}

interface NavGroup {
  type: 'group';
  label: string;
  items: NavLink[];
}

type NavItem = NavLink | NavGroup;

// ─── DOM 解析 ─────────────────────────────────────────────────────────────

function resolveHref(href: string): string {
  try {
    return new URL(href, location.origin).href;
  } catch {
    return href;
  }
}

function parseNavItems(ul: HTMLUListElement): NavItem[] {
  const out: NavItem[] = [];
  for (const li of ul.children) {
    if (!(li instanceof HTMLElement)) continue;
    if (li.classList.contains('logoff')) continue;

    if (li.classList.contains('dropdown')) {
      const toggle = li.querySelector<HTMLElement>(':scope > a.dropdown-toggle');
      const menu = li.querySelector<HTMLElement>(':scope > ul.dropdown-menu');
      if (!toggle || !menu) continue;

      const clone = toggle.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.caret').forEach((c) => c.remove());
      const groupLabel = clone.textContent?.replace(/\s+/g, ' ').trim() ?? '';

      const subs: NavLink[] = [];
      for (const a of menu.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        const h = a.getAttribute('href');
        if (!h || h === '#' || h.startsWith('javascript:')) continue;
        subs.push({
          type: 'link',
          label: a.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          href: h,
          target: a.getAttribute('target') ?? '',
          title: a.getAttribute('title') ?? '',
        });
      }
      if (subs.length === 0) continue;
      out.push(subs.length === 1 ? subs[0] : { type: 'group', label: groupLabel, items: subs });
    } else {
      const a = li.querySelector<HTMLAnchorElement>(':scope > a[href]');
      if (!a) continue;
      const h = a.getAttribute('href');
      if (!h || h === '#' || h.startsWith('javascript:')) continue;
      out.push({
        type: 'link',
        label: a.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        href: h,
        target: a.getAttribute('target') ?? '',
        title: a.getAttribute('title') ?? '',
      });
    }
  }
  return out;
}

function localizePortalNavItems(
  items: NavItem[],
  t: I18nMessages,
  language: AppLanguage,
): NavItem[] {
  return items.map((item) => {
    if (item.type === 'link') {
      return { ...item, label: resolvePortalNavLabel(item.href, item.label, t, language) };
    }
    return {
      ...item,
      label: resolvePortalNavLabel(item.items[0]?.href ?? '', item.label, t, language),
      items: item.items.map((sub) => ({
        ...sub,
        label: resolvePortalNavLabel(sub.href, sub.label, t, language),
      })),
    };
  });
}

/** Home2 `#NavigationMenu` → `NavItem[]` */
function parseHome2NavItems(menuRoot: HTMLElement): NavItem[] {
  const ul = menuRoot.querySelector<HTMLUListElement>('ul.level1');
  if (!ul) return [];
  const out: NavItem[] = [];
  for (const li of ul.children) {
    if (!(li instanceof HTMLElement)) continue;

    if (li.classList.contains('has-popup')) {
      const toggle = li.querySelector<HTMLAnchorElement>(':scope > a');
      const subUl = li.querySelector<HTMLUListElement>(':scope > ul.level2');
      if (!toggle || !subUl) continue;
      const groupLabel = toggle.textContent?.replace(/\s+/g, ' ').trim() ?? '';

      const subs: NavLink[] = [];
      for (const a of subUl.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        const h = a.getAttribute('href');
        if (!h || h === '#' || h.toLowerCase().startsWith('javascript:')) continue;
        subs.push({
          type: 'link',
          label: a.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          href: h,
          target: a.getAttribute('target') ?? '',
          title: a.getAttribute('title') ?? '',
        });
      }
      if (subs.length === 0) continue;
      out.push(subs.length === 1 ? subs[0] : { type: 'group', label: groupLabel, items: subs });
    } else {
      const a = li.querySelector<HTMLAnchorElement>(':scope > a[href]');
      if (!a) continue;
      const h = a.getAttribute('href');
      if (!h || h === '#' || h.toLowerCase().startsWith('javascript:')) continue;
      out.push({
        type: 'link',
        label: a.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        href: h,
        target: a.getAttribute('target') ?? '',
        title: a.getAttribute('title') ?? '',
      });
    }
  }
  return out;
}

const HIDDEN_HOME2_NAV_LABELS = new Set(['実験中', 'KCG WebMail']);
const HOST_HOME_LABEL = 'ホーム';
const HOST_PORTAL_LABEL = 'キャンパスプランポータル';

function localizeHome2NavItems(items: NavItem[], t: I18nMessages): NavItem[] {
  const labels = { home: t.common.home, portal: t.header.portal };
  return finalizeHome2NavItems(items, labels);
}

/** Home2 メニュー項目のリンク・ラベル調整 */
interface Home2NavLabels {
  home: string;
  portal: string;
}

function mapHome2Link(link: NavLink, labels: Home2NavLabels): NavLink | null {
  const t = link.label.trim();
  if (HIDDEN_HOME2_NAV_LABELS.has(t)) return null;
  const href = t === HOST_HOME_LABEL ? HOME2_TOP_PAGE_URL : link.href;
  const label =
    t === HOST_PORTAL_LABEL ? labels.portal : t === HOST_HOME_LABEL ? labels.home : link.label;
  return { ...link, href, label };
}

function finalizeHome2NavItems(items: NavItem[], labels: Home2NavLabels): NavItem[] {
  const out: NavItem[] = [];
  for (const item of items) {
    if (item.type === 'link') {
      const mapped = mapHome2Link(item, labels);
      if (mapped) out.push(mapped);
      continue;
    }
    if (HIDDEN_HOME2_NAV_LABELS.has(item.label.trim())) continue;
    const groupLabel = item.label.trim() === HOST_PORTAL_LABEL ? labels.portal : item.label;
    const subs = item.items
      .map((sub) => mapHome2Link(sub, labels))
      .filter((s): s is NavLink => s != null);
    if (subs.length === 0) continue;

    const homeSplit =
      item.label.trim() === HOST_HOME_LABEL &&
      subs.length >= 2 &&
      subs[0]!.label.trim() === labels.home;
    if (homeSplit) {
      out.push({
        type: 'link',
        label: labels.home,
        href: HOME2_TOP_PAGE_URL,
        target: '',
        title: '',
      });
      continue;
    }

    out.push(subs.length === 1 ? subs[0]! : { ...item, label: groupLabel, items: subs });
  }
  return out;
}

// ─── カスタムフック ───────────────────────────────────────────────────────

function usePortalProfile(fallbackTitle: string) {
  const [profile, setProfile] = useState<{ name: string; href: string; title: string } | null>(
    null,
  );

  // マウント時に一度だけ DOM から取得。表示/非表示は呼び出し側で CSS クラスで制御する。
  useEffect(() => {
    const src = [...document.querySelectorAll<HTMLAnchorElement>('span.profile a[href]')].find(
      (a) => !a.closest('#portal-overlay'),
    );
    const name = src?.textContent?.trim() ?? '';
    if (!name) {
      setProfile(null);
      return;
    }
    let href = '/portal/Profile';
    try {
      href = new URL(src!.getAttribute('href') ?? '/portal/Profile', location.origin).href;
    } catch {}
    setProfile({ name, href, title: src!.getAttribute('title') ?? fallbackTitle });
  }, [fallbackTitle]);

  return profile;
}

// ─── コンポーネント ────────────────────────────────────────────────────────

interface HeaderProps {
  settings: Settings;
  settingsReady: boolean;
  settingsOpen: boolean;
  onSettingsToggle: () => void;
  settingsPopover: ReactNode;
  navSource?: 'portal' | 'home2-mail';
}

export function Header({
  settings,
  settingsReady,
  settingsOpen,
  onSettingsToggle,
  settingsPopover,
  navSource = 'portal',
}: HeaderProps) {
  const { t, language } = useI18n();
  const { updateAvailable } = useExtensionUpdateAvailable();
  const [rawNavItems, setRawNavItems] = useState<NavItem[]>([]);
  const [showLogout, setShowLogout] = useState(navSource === 'portal');
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityConsentOpen, setActivityConsentOpen] = useState(false);
  const [communityEnabled, setCommunityEnabled] = useState(false);
  const profile = usePortalProfile(t.header.profileTitle);

  const navItems = useMemo(() => {
    if (navSource === 'portal') return localizePortalNavItems(rawNavItems, t, language);
    return localizeHome2NavItems(rawNavItems, t);
  }, [rawNavItems, navSource, t, language]);

  useEffect(() => {
    if (navSource === 'portal') {
      const ul = [...document.querySelectorAll<HTMLUListElement>('ul.nav.navbar-nav')].find(
        (el) => !el.closest(`#${PORTAL_DOM.overlayRoot}`),
      );
      setRawNavItems(ul ? parseNavItems(ul) : []);
      setShowLogout(true);
      return;
    }

    const menu = document.getElementById('NavigationMenu');
    if (menu && !menu.closest(`#${PORTAL_DOM.overlayRoot}`)) {
      setRawNavItems(parseHome2NavItems(menu));
    } else {
      setRawNavItems([]);
    }

    const nativePortalLogout = findHostLogoffAnchor(PORTAL_DOM.overlayRoot) != null;

    const webMailLo = document.getElementById('MainContent_butLogout');
    const hasWebMailLogout =
      webMailLo instanceof HTMLInputElement && !webMailLo.closest(`#${PORTAL_DOM.overlayRoot}`);

    setShowLogout(nativePortalLogout || hasWebMailLogout);
  }, [navSource]);

  useEffect(() => {
    if (navSource !== 'portal') {
      setCommunityEnabled(false);
      return;
    }
    const controller = new AbortController();
    void getOrCreateClientUserId()
      .then((userId) =>
        fetch(COMMUNITY_ACCESS_URL, {
          cache: 'no-store',
          headers: { [CLIENT_USER_ID_HEADER]: userId },
          signal: controller.signal,
        }),
      )
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error())))
      .then((result: { enabled?: unknown }) => setCommunityEnabled(result.enabled === true))
      .catch(() => {
        if (!controller.signal.aborted) setCommunityEnabled(false);
      });
    return () => controller.abort();
  }, [navSource]);

  /**
   * `href` が実URLのときだけ location 遷移する。`#` / `javascript:` / PostBack 等は click に任せる。
   */
  function tryAssignLocationFromLogoutAnchor(a: HTMLAnchorElement): boolean {
    const raw = a.getAttribute('href')?.trim() ?? '';
    if (!raw || raw === '#' || raw.toLowerCase().startsWith('javascript:')) return false;
    try {
      const u = new URL(raw, location.href);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    } catch {
      return false;
    }
    window.location.href = a.href;
    return true;
  }

  function handleLogout() {
    if (navSource === 'home2-mail') {
      const webLo = document.getElementById('MainContent_butLogout');
      if (webLo instanceof HTMLInputElement && !webLo.closest(`#${PORTAL_DOM.overlayRoot}`)) {
        webLo.click();
        return;
      }
    }
    const logoutLink = findHostLogoffAnchor(PORTAL_DOM.overlayRoot);
    if (navSource === 'home2-mail' && !logoutLink) return;
    if (logoutLink) {
      if (tryAssignLocationFromLogoutAnchor(logoutLink)) return;
      // `javascript:__doPostBack` 等は隔離ワールドの click が Chrome CSP で拒否されるため MAIN へ委譲
      requestHostPortalLogoff();
      return;
    }
    window.location.href = '/portal/Login';
  }

  const navLabel = navSource === 'home2-mail' ? t.header.home2Menu : t.header.portalMenu;

  async function openCommunityActivity() {
    const accepted = await storage
      .get(SK.communityDisclaimerAccepted)
      .then((value) => value[SK.communityDisclaimerAccepted] === true)
      .catch(() => false);
    if (accepted) setActivityOpen(true);
    else setActivityConsentOpen(true);
  }

  async function acceptCommunityDisclaimer() {
    try {
      await storage.set({ [SK.communityDisclaimerAccepted]: true });
    } catch {
      // 同意済み状態を保存できない場合も、今回の明示的な同意では利用を続けられるようにする。
    }
    setActivityConsentOpen(false);
    setActivityOpen(true);
  }

  return (
    <>
      <header className="p-header">
        <div className="p-header-inner">
          {navSource === 'home2-mail' ? (
            <a className="p-brand" href={HOME2_MAIL_DEFAULT_URL}>
              <img src={`${HOME2_ORIGIN}/ic.bmp`} width={28} height={28} alt="" />
              <span>{t.header.webMail}</span>
            </a>
          ) : (
            <a className="p-brand" href="/portal/">
              <img src="/portal/favicon.ico" width={28} height={28} alt="" />
              <span>{t.header.portal}</span>
            </a>
          )}

          {navItems.length > 0 && (
            <nav className="p-site-nav" id="p-site-nav" aria-label={navLabel}>
              {navItems.map((item, i) =>
                item.type === 'link' ? (
                  <NavLinkItem key={i} item={item} />
                ) : (
                  <NavGroupItem key={i} item={item} />
                ),
              )}
            </nav>
          )}

          {navSource === 'portal' && language === 'ja' && communityEnabled ? (
            <button
              type="button"
              className="p-community-activity-entry"
              aria-label={t.header.communityActivity}
              aria-expanded={activityOpen}
              aria-controls="p-community-activity-drawer"
              onClick={() => void openCommunityActivity()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="9" cy="10" r="2" fill="currentColor" />
                <path
                  d="m5.5 17 4.2-4 3.1 2.7 2.7-2.5 3 3.8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}

          <div className="p-header-actions">
            <div className="p-settings-wrap" id="p-settings-wrap">
              <button
                type="button"
                className={`p-settings-open${updateAvailable ? ' has-update' : ''}`}
                id="p-open-settings"
                aria-expanded={settingsOpen}
                aria-haspopup="dialog"
                aria-controls="p-settings-dialog"
                onClick={(e) => {
                  e.stopPropagation();
                  onSettingsToggle();
                }}
                title={updateAvailable ? t.settings.updateAvailableTitle : undefined}
              >
                {updateAvailable && <span className="p-settings-update-pulse" aria-hidden="true" />}
                {t.header.settings}
              </button>
              {settingsPopover}
            </div>

            {settingsReady && profile && (
              <span
                className={`p-profile-wrap${settings.hideProfileName ? ' is-hidden' : ''}`}
                id="p-profile-wrap"
                aria-hidden={settings.hideProfileName}
              >
                <a className="p-profile-link" href={profile.href} title={profile.title}>
                  {profile.name}
                </a>
              </span>
            )}

            {showLogout ? (
              <button type="button" className="p-logout" onClick={handleLogout}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {t.header.logout}
              </button>
            ) : null}
          </div>
        </div>
      </header>
      {activityOpen
        ? createPortal(
            <CommunityActivityDrawer
              language={language}
              defaultAuthorName={profile?.name ?? ''}
              onClose={() => setActivityOpen(false)}
            />,
            document.getElementById(PORTAL_DOM.overlayRoot) ?? document.body,
          )
        : null}
      {activityConsentOpen
        ? createPortal(
            <CommunityConsentDialog
              language={language}
              onCancel={() => setActivityConsentOpen(false)}
              onAccept={() => void acceptCommunityDisclaimer()}
            />,
            document.getElementById(PORTAL_DOM.overlayRoot) ?? document.body,
          )
        : null}
    </>
  );
}

function CommunityConsentDialog({
  language,
  onCancel,
  onAccept,
}: {
  language: AppLanguage;
  onCancel: () => void;
  onAccept: () => void;
}) {
  const ja = language === 'ja';
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="p-community-consent-layer" role="presentation">
      <section
        className="p-community-consent"
        role="dialog"
        aria-modal="true"
        aria-labelledby="p-community-consent-title"
      >
        <div className="p-community-consent-mark" aria-hidden="true">
          !
        </div>
        <small>{ja ? 'ご利用前に必ずご確認ください' : 'Please read before continuing'}</small>
        <h2 id="p-community-consent-title">
          {ja
            ? '「みんなの活動」は学校の公式サービスではありません'
            : 'Campus Community is not an official school service'}
        </h2>
        <p>
          {ja
            ? 'この機能は本拡張機能が独自に提供するコミュニティ機能です。京都コンピュータ学院・京都情報大学院大学および学校関係者は、運営・審査・サポートに関与していません。'
            : 'This community is independently provided by this extension. The school and its staff do not operate, review, endorse, or support it.'}
        </p>
        <ul>
          <li>
            {ja
              ? '投稿内容やプロフィール情報は、学校とは別のコミュニティサーバーへ送信されます。'
              : 'Posts and profile information are sent to a separate community server.'}
          </li>
          <li>
            {ja
              ? '学校のログインID・パスワードは絶対に入力しないでください。'
              : 'Never enter or reuse your school login ID or password.'}
          </li>
          <li>
            {ja
              ? '投稿や交流は、ご自身の判断と責任で行ってください。'
              : 'Use posting and social features at your own discretion and responsibility.'}
          </li>
        </ul>
        <label className="p-community-consent-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.currentTarget.checked)}
          />
          <span>
            {ja
              ? '学校とは無関係の独立したサービスであることを理解し、自分の判断で利用します。'
              : 'I understand this is an independent service unrelated to the school and choose to use it.'}
          </span>
        </label>
        <footer>
          <button type="button" onClick={onCancel}>
            {ja ? '利用しない' : 'Cancel'}
          </button>
          <button className="is-primary" type="button" disabled={!confirmed} onClick={onAccept}>
            {ja ? '同意して開く' : 'Agree and continue'}
          </button>
        </footer>
      </section>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyCommunityActivityPlaceholder({
  language,
  onClose,
}: {
  language: AppLanguage;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const ja = language === 'ja';

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const posts = ja
    ? [
        {
          author: '映像制作サークル',
          initials: '映',
          title: '新歓映像の撮影日でした',
          tag: '作品制作',
          time: '12分前',
          likes: 38,
        },
        {
          author: 'ゲーム開発部',
          initials: 'G',
          title: '学内ゲームジャム、制作中',
          tag: 'クラブ活動',
          time: '45分前',
          likes: 64,
        },
        {
          author: 'デザイン学科 2年',
          initials: 'D',
          title: '今日の課題作品を共有します',
          tag: '学生作品',
          time: '2時間前',
          likes: 27,
        },
        {
          author: '学生会',
          initials: '学',
          title: '七夕イベントを準備しています',
          tag: 'イベント',
          time: '3時間前',
          likes: 91,
        },
      ]
    : [
        {
          author: 'Film club',
          initials: 'F',
          title: 'Filming our welcome video',
          tag: 'Creative work',
          time: '12 min',
          likes: 38,
        },
        {
          author: 'Game dev club',
          initials: 'G',
          title: 'Campus game jam in progress',
          tag: 'Club activity',
          time: '45 min',
          likes: 64,
        },
        {
          author: 'Design student',
          initials: 'D',
          title: "Sharing today's assignment",
          tag: 'Student work',
          time: '2 hr',
          likes: 27,
        },
        {
          author: 'Student council',
          initials: 'S',
          title: 'Preparing the Tanabata event',
          tag: 'Events',
          time: '3 hr',
          likes: 91,
        },
      ];

  return (
    <div className="p-community-activity-root">
      <button
        type="button"
        className="p-community-activity-dismiss"
        aria-label={ja ? 'みんなの活動を閉じる' : 'Close community activities'}
        onClick={onClose}
      />
      <section
        className="p-community-activity-drawer"
        id="p-community-activity-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="p-community-activity-title"
      >
        <header className="p-community-activity-head">
          <div>
            <span>{ja ? 'CAMPUS COMMUNITY' : 'CAMPUS COMMUNITY'}</span>
            <h2 id="p-community-activity-title">{ja ? 'みんなの活動' : "Everyone's activities"}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={ja ? '閉じる' : 'Close'}
          >
            ×
          </button>
        </header>
        <div className="p-community-activity-body">
          <div className="p-community-activity-toolbar">
            <div
              className="p-community-feed-tabs"
              role="tablist"
              aria-label={ja ? '投稿の表示順' : 'Feed order'}
            >
              <button type="button" className="is-active" role="tab" aria-selected="true">
                {ja ? 'おすすめ' : 'For you'}
              </button>
              <button type="button" role="tab" aria-selected="false">
                {ja ? '新着' : 'Latest'}
              </button>
            </div>
            <label className="p-community-search">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                type="search"
                placeholder={ja ? '活動やタグを検索' : 'Search activities or tags'}
              />
            </label>
            <button type="button" className="p-community-create-post">
              ＋ {ja ? '投稿する' : 'Create post'}
            </button>
          </div>
          <div className="p-community-activity-layout">
            <main
              className="p-community-activity-feed"
              aria-label={ja ? '投稿一覧のプレビュー' : 'Feed preview'}
            >
              {posts.map((post, index) => (
                <article className="p-community-post" key={post.title}>
                  <div className="p-community-post-head">
                    <span className={`p-community-avatar p-community-avatar--${index + 1}`}>
                      {post.initials}
                    </span>
                    <div>
                      <strong>{post.author}</strong>
                      <span>{post.time}</span>
                    </div>
                    <button type="button" aria-label={ja ? '投稿メニュー' : 'Post menu'}>
                      •••
                    </button>
                  </div>
                  <div className={`p-community-post-image p-community-post-image--${index + 1}`}>
                    <span className="p-community-post-tag">#{post.tag}</span>
                    <div className="p-community-photo-mark" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <div className="p-community-post-actions">
                    <button type="button" aria-label={ja ? 'いいね' : 'Like'}>
                      <span aria-hidden>♡</span> {post.likes}
                    </button>
                    <button type="button" aria-label={ja ? 'コメント' : 'Comment'}>
                      <span aria-hidden>○</span> {index + 2}
                    </button>
                    <button
                      type="button"
                      className="p-community-post-save"
                      aria-label={ja ? '保存' : 'Save'}
                    >
                      ◇
                    </button>
                  </div>
                  <p>
                    <strong>{post.author}</strong> {post.title}
                  </p>
                </article>
              ))}
            </main>
            <aside className="p-community-activity-aside">
              <section className="p-community-welcome-card">
                <span className="p-community-welcome-icon" aria-hidden>
                  ✦
                </span>
                <h3>{ja ? 'キャンパスの今を共有' : 'Share campus life'}</h3>
                <p>
                  {ja
                    ? '作品、イベント、サークル活動。学生同士で新しい発見を共有できる場所です。'
                    : 'A place to share projects, events, clubs, and everyday discoveries.'}
                </p>
                <button type="button">{ja ? '最初の投稿を作る' : 'Create your first post'}</button>
              </section>
              <section className="p-community-trends">
                <div>
                  <h3>{ja ? '注目のタグ' : 'Trending tags'}</h3>
                  <button type="button">{ja ? 'すべて見る' : 'View all'}</button>
                </div>
                {['学生作品', 'クラブ活動', 'イベント', 'キャンパスの日常'].map((tag, index) => (
                  <button type="button" key={tag}>
                    <span>
                      #{ja ? tag : ['student-work', 'clubs', 'events', 'campus-life'][index]}
                    </span>
                    <small>
                      {[24, 18, 13, 9][index]} {ja ? '件' : 'posts'}
                    </small>
                  </button>
                ))}
              </section>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── ナビアイテムコンポーネント ───────────────────────────────────────────

function NavLinkItem({ item }: { item: NavLink }) {
  const href = resolveHref(item.href);
  const isBlank = item.target && item.target !== '_self';
  return (
    <a
      className="p-nav-btn"
      href={href}
      target={isBlank ? item.target : undefined}
      rel={isBlank ? 'noopener noreferrer' : undefined}
      title={item.title || undefined}
    >
      {item.label}
    </a>
  );
}

function NavGroupItem({ item }: { item: NavGroup }) {
  return (
    <details className="p-nav-dd">
      <summary className="p-nav-btn p-nav-dd-sum">{item.label}</summary>
      <div className="p-nav-dd-panel">
        {item.items.map((sub, i) => (
          <NavLinkItem key={i} item={sub} />
        ))}
      </div>
    </details>
  );
}
