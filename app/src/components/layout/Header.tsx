/**
 * ポータルのヘッダーコンポーネント。
 * 既存の DOM からナビリンクとプロフィール情報を取得して再現する。
 */

import { useEffect, useState, type ReactNode } from 'react';
import type { Settings } from '../../context/settings';

// ─── ナビゲーション型 ─────────────────────────────────────────────────────

interface NavLink {
  type:    'link';
  label:   string;
  href:    string;
  target?: string;
  title?:  string;
}

interface NavGroup {
  type:  'group';
  label: string;
  items: NavLink[];
}

type NavItem = NavLink | NavGroup;

// ─── DOM 解析 ─────────────────────────────────────────────────────────────

function resolveHref(href: string): string {
  try { return new URL(href, location.origin).href; } catch { return href; }
}

function parseNavItems(ul: HTMLUListElement): NavItem[] {
  const out: NavItem[] = [];
  for (const li of ul.children) {
    if (!(li instanceof HTMLElement)) continue;
    if (li.classList.contains('logoff')) continue;

    if (li.classList.contains('dropdown')) {
      const toggle = li.querySelector<HTMLElement>(':scope > a.dropdown-toggle');
      const menu   = li.querySelector<HTMLElement>(':scope > ul.dropdown-menu');
      if (!toggle || !menu) continue;

      const clone = toggle.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('.caret').forEach((c) => c.remove());
      const groupLabel = clone.textContent?.replace(/\s+/g, ' ').trim() ?? '';

      const subs: NavLink[] = [];
      for (const a of menu.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        const h = a.getAttribute('href');
        if (!h || h === '#' || h.startsWith('javascript:')) continue;
        subs.push({
          type:   'link',
          label:  a.textContent?.replace(/\s+/g, ' ').trim() ?? '',
          href:   h,
          target: a.getAttribute('target') ?? '',
          title:  a.getAttribute('title')  ?? '',
        });
      }
      if (subs.length === 0) continue;
      // サブメニューが 1 件ならグループ不要
      out.push(subs.length === 1 ? subs[0] : { type: 'group', label: groupLabel, items: subs });
    } else {
      const a = li.querySelector<HTMLAnchorElement>(':scope > a[href]');
      if (!a) continue;
      const h = a.getAttribute('href');
      if (!h || h === '#' || h.startsWith('javascript:')) continue;
      out.push({
        type:   'link',
        label:  a.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        href:   h,
        target: a.getAttribute('target') ?? '',
        title:  a.getAttribute('title')  ?? '',
      });
    }
  }
  return out;
}

// ─── カスタムフック ───────────────────────────────────────────────────────

function usePortalProfile() {
  const [profile, setProfile] = useState<{ name: string; href: string; title: string } | null>(null);

  // マウント時に一度だけ DOM から取得。表示/非表示は呼び出し側で CSS クラスで制御する。
  useEffect(() => {
    const src = [...document.querySelectorAll<HTMLAnchorElement>('span.profile a[href]')]
      .find((a) => !a.closest('#portal-overlay'));
    const name = src?.textContent?.trim() ?? '';
    if (!name) { setProfile(null); return; }
    let href = '/portal/Profile';
    try { href = new URL(src!.getAttribute('href') ?? '/portal/Profile', location.origin).href; } catch {}
    setProfile({ name, href, title: src!.getAttribute('title') ?? 'プロフィール' });
  }, []);

  return profile;
}

// ─── コンポーネント ────────────────────────────────────────────────────────

interface HeaderProps {
  settings:         Settings;
  settingsReady:    boolean;
  settingsOpen:     boolean;
  onSettingsToggle: () => void;
  settingsPopover:  ReactNode;
}

export function Header({ settings, settingsReady, settingsOpen, onSettingsToggle, settingsPopover }: HeaderProps) {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const profile = usePortalProfile();

  useEffect(() => {
    const ul = [...document.querySelectorAll<HTMLUListElement>('ul.nav.navbar-nav')]
      .find((el) => !el.closest('#portal-overlay'));
    if (ul) setNavItems(parseNavItems(ul));
  }, []);

  function handleLogout() {
    const logoutLink = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
      .find((a) => !a.closest('#portal-overlay') && a.closest('li.logoff'));
    window.location.href = logoutLink?.href ?? '/portal/Login';
  }

  return (
    <header className="p-header">
      <div className="p-header-inner">
        <a className="p-brand" href="/portal/">
          <img src="/portal/favicon.ico" width={28} height={28} alt="" />
          <span>ポータル</span>
        </a>

        {navItems.length > 0 && (
          <nav className="p-site-nav" id="p-site-nav" aria-label="ポータルメニュー">
            {navItems.map((item, i) =>
              item.type === 'link'
                ? <NavLinkItem key={i} item={item} />
                : <NavGroupItem key={i} item={item} />
            )}
          </nav>
        )}

        <div className="p-header-actions">
          <div className="p-settings-wrap" id="p-settings-wrap">
            <button
              type="button"
              className="p-settings-open"
              id="p-open-settings"
              aria-expanded={settingsOpen}
              aria-haspopup="dialog"
              aria-controls="p-settings-dialog"
              onClick={(e) => { e.stopPropagation(); onSettingsToggle(); }}
            >
              設定
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

          <button type="button" className="p-logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── ナビアイテムコンポーネント ───────────────────────────────────────────

function NavLinkItem({ item }: { item: NavLink }) {
  const href    = resolveHref(item.href);
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
        {item.items.map((sub, i) => <NavLinkItem key={i} item={sub} />)}
      </div>
    </details>
  );
}
