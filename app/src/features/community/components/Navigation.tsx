import type { CommunityPage, CommunityUser } from '../types';
import { Avatar } from './Avatar';
import { Glyph } from './Glyph';

export function Sidebar({
  page,
  user,
  ja,
  unreadCount,
  go,
  onLogin,
}: {
  page: CommunityPage;
  user: CommunityUser | null;
  ja: boolean;
  unreadCount: number;
  go: (page: CommunityPage) => void;
  onLogin: () => void;
}) {
  return (
    <aside className="community-sidebar">
      <button className="community-brand" onClick={() => go('home')}>
        <img src={browser.runtime.getURL('community/activity-icon.png' as never)} alt="" />
        <strong>{ja ? 'みんなの活動' : 'Community'}</strong>
      </button>
      <nav>
        <NavButton
          active={page === 'home'}
          icon="home"
          label={ja ? 'ホーム' : 'Home'}
          onClick={() => go('home')}
        />
        <NavButton
          active={page === 'explore'}
          icon="search"
          label={ja ? '見つける' : 'Explore'}
          onClick={() => go('explore')}
        />
        <NavButton
          active={page === 'following'}
          icon="heart"
          label={ja ? 'フォロー中' : 'Following'}
          onClick={() => go('following')}
        />
        <NavButton
          active={page === 'notifications'}
          icon="bell"
          label={ja ? '通知' : 'Notifications'}
          badge={user ? unreadCount : undefined}
          onClick={() => go('notifications')}
        />
        <NavButton
          active={page === 'profile'}
          icon="user"
          label={ja ? 'プロフィール' : 'Profile'}
          onClick={() => go('profile')}
        />
      </nav>
      <button className="community-create" onClick={() => go('create')}>
        <Glyph name="plus" />
        {ja ? '新しい投稿' : 'New post'}
      </button>
      <div className="community-account">
        {user ? (
          <button className="community-account-user" type="button" onClick={() => go('profile')}>
            <Avatar user={user} />
            <span>
              <strong>{user.displayName}</strong>
              <em>@{user.loginId}</em>
            </span>
          </button>
        ) : (
          <>
            <p>{ja ? '投稿するにはログインが必要です。' : 'Log in to create posts.'}</p>
            <button onClick={onLogin}>{ja ? 'ログイン' : 'Log in'}</button>
          </>
        )}
      </div>
    </aside>
  );
}

function NavButton({
  active,
  icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: 'home' | 'search' | 'user' | 'heart' | 'bell';
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button className={active ? 'is-active' : ''} onClick={onClick}>
      <Glyph name={icon} />
      <span>{label}</span>
      {badge ? <b className="community-nav-badge">{badge > 99 ? '99+' : badge}</b> : null}
    </button>
  );
}

export function MobileNav({
  page,
  user,
  ja,
  unreadCount,
  go,
  onLogin,
}: {
  page: CommunityPage;
  user: CommunityUser | null;
  ja: boolean;
  unreadCount: number;
  go: (page: CommunityPage) => void;
  onLogin: () => void;
}) {
  return (
    <nav className="community-mobile-nav">
      <NavButton
        active={page === 'home'}
        icon="home"
        label={ja ? 'ホーム' : 'Home'}
        onClick={() => go('home')}
      />
      <NavButton
        active={page === 'explore'}
        icon="search"
        label={ja ? '見つける' : 'Explore'}
        onClick={() => go('explore')}
      />
      <NavButton
        active={page === 'following'}
        icon="heart"
        label={ja ? 'フォロー' : 'Following'}
        onClick={() => go('following')}
      />
      <NavButton
        active={page === 'notifications'}
        icon="bell"
        label={ja ? '通知' : 'Notifications'}
        badge={user ? unreadCount : undefined}
        onClick={() => go('notifications')}
      />
      <button onClick={() => go('create')}>
        <Glyph name="plus" />
        <span>{ja ? '投稿' : 'Post'}</span>
      </button>
      <NavButton
        active={page === 'profile'}
        icon="user"
        label={user ? (ja ? '自分' : 'Profile') : ja ? 'ログイン' : 'Log in'}
        onClick={user ? () => go('profile') : onLogin}
      />
    </nav>
  );
}
