import type { CommunityPage, CommunityUser } from '../types';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { Glyph } from './Glyph';
import { cn } from '../../../lib/cn';

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
    <aside
      className={
        'community-sidebar tw-flex tw-min-w-0 tw-flex-col tw-gap-3 tw-border-r tw-border-community-border tw-bg-community-bg2 tw-px-3 tw-pb-4 max-[960px]:tw-items-stretch max-[960px]:tw-px-2 max-[620px]:tw-hidden [&>nav]:tw-mt-1 [&>nav]:tw-grid [&>nav]:tw-gap-1'
      }
    >
      <button
        className={
          'community-brand tw-mx-[-12px] tw-flex tw-min-h-14 tw-items-center tw-gap-3.5 tw-border-0 tw-border-b tw-border-community-border tw-bg-[color-mix(in_srgb,var(--p-bg2)_94%,transparent)] tw-px-5 tw-text-left tw-cursor-pointer max-[960px]:tw-mx-[-8px] max-[960px]:tw-justify-center max-[960px]:tw-px-0 [&>img]:tw-h-9 [&>img]:tw-w-9 [&>img]:tw-flex-none [&>img]:tw-object-contain max-[960px]:[&>img]:tw-h-8 max-[960px]:[&>img]:tw-w-8 [&>strong]:tw-overflow-hidden [&>strong]:tw-text-ellipsis [&>strong]:tw-whitespace-nowrap [&>strong]:tw-text-[15px] [&>strong]:tw-font-bold [&>strong]:tw-text-community-bright max-[960px]:[&>strong]:tw-hidden'
        }
        onClick={() => go('home')}
      >
        <img src={browser.runtime.getURL('/community/activity-icon.png')} alt="" />
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
          active={page === 'bookmarks'}
          icon="bookmark"
          label={ja ? '保存済み' : 'Bookmarks'}
          onClick={() => go('bookmarks')}
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
      <button
        className={
          'community-create tw-flex tw-min-h-[38px] tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border-0 tw-bg-community-accent tw-px-3 tw-text-sm tw-font-extrabold tw-text-community-on-accent tw-cursor-pointer tw-transition-[transform,filter,box-shadow] tw-duration-200 tw-ease-out hover:tw-translate-y-[-2px] hover:tw-brightness-110 hover:tw-shadow-[0_10px_24px_color-mix(in_srgb,var(--p-accent)_35%,transparent)] active:tw-translate-y-0 active:tw-scale-[.98] max-[960px]:tw-min-h-11 max-[960px]:tw-px-0 max-[960px]:tw-text-0 [&>svg]:tw-h-[19px] [&>svg]:tw-w-[19px] [&>svg]:tw-stroke-[2.4] [&>svg]:tw-transition-transform [&>svg]:tw-duration-200 hover:[&>svg]:tw-rotate-90'
        }
        onClick={() => go('create')}
      >
        <Glyph name="plus" />
        {ja ? '新しい投稿' : 'New post'}
      </button>
      <div
        className={
          'community-account tw-mt-auto tw-border-t tw-border-community-border tw-pt-2 [&>p]:tw-mb-2 [&>p]:tw-mt-0 [&>p]:tw-text-[13px] [&>p]:tw-text-community-muted max-[960px]:[&>p]:tw-hidden [&>button:not(.community-account-user)]:tw-flex [&>button:not(.community-account-user)]:tw-min-h-[38px] [&>button:not(.community-account-user)]:tw-w-full [&>button:not(.community-account-user)]:tw-items-center [&>button:not(.community-account-user)]:tw-justify-center [&>button:not(.community-account-user)]:tw-rounded-xl [&>button:not(.community-account-user)]:tw-border [&>button:not(.community-account-user)]:tw-border-community-border [&>button:not(.community-account-user)]:tw-bg-community-bg3 [&>button:not(.community-account-user)]:tw-font-bold [&>button:not(.community-account-user)]:tw-text-community-accent-light'
        }
      >
        {user ? (
          <button
            className={
              'community-account-user tw-flex tw-min-h-[50px] tw-w-full tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg3 tw-p-2 tw-text-left tw-text-community-text tw-cursor-pointer tw-transition-[transform,border-color,background-color,box-shadow] tw-duration-200 tw-ease-out hover:tw-translate-y-[-2px] hover:tw-border-community-accent hover:tw-bg-community-accent-bg hover:tw-shadow-community-card active:tw-translate-y-0 max-[960px]:tw-justify-center max-[960px]:tw-p-1 [&>span:last-child]:tw-grid [&>span:last-child]:tw-min-w-0 max-[960px]:[&>span:last-child]:tw-hidden [&_strong]:tw-overflow-hidden [&_strong]:tw-text-ellipsis [&_strong]:tw-whitespace-nowrap [&_strong]:tw-text-community-bright [&_em]:tw-overflow-hidden [&_em]:tw-text-ellipsis [&_em]:tw-whitespace-nowrap [&_em]:tw-text-xs [&_em]:tw-not-italic [&_em]:tw-text-community-muted'
            }
            type="button"
            onClick={() => go('profile')}
          >
            <Avatar user={user} />
            <span>
              <span className="tw-flex tw-min-w-0 tw-items-center tw-gap-1">
                <strong>{user.displayName}</strong>
                {user.verified ? <VerifiedBadge ja={ja} /> : null}
              </span>
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
  icon: 'home' | 'search' | 'user' | 'heart' | 'bookmark' | 'bell' | 'comment';
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'community-nav-button tw-relative tw-flex tw-min-h-[38px] tw-items-center tw-gap-3 tw-rounded-lg tw-border-0 tw-bg-transparent tw-px-3 tw-text-sm tw-font-semibold tw-text-community-muted tw-cursor-pointer tw-transition-[background-color,color,transform] tw-duration-200 tw-ease-out hover:tw-translate-x-[2px] hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light [&.is-active]:tw-bg-community-accent-bg [&.is-active]:tw-text-community-accent-light max-[960px]:tw-justify-center max-[960px]:tw-translate-x-0 max-[960px]:tw-px-0 max-[960px]:[&>span]:tw-hidden [&>svg]:tw-h-[18px] [&>svg]:tw-w-[18px] [&>svg]:tw-flex-none [&>svg]:tw-fill-none [&>svg]:tw-stroke-current [&>svg]:tw-stroke-[1.9] [&>svg]:tw-transition-transform [&>svg]:tw-duration-200 hover:[&>svg]:tw-scale-110',
        active && 'is-active',
      )}
      onClick={onClick}
    >
      <Glyph name={icon} />
      <span>{label}</span>
      {badge ? (
        <b
          className={
            'community-nav-badge tw-ml-auto tw-min-w-5 tw-animate-community-badge-pop tw-rounded-full tw-bg-community-danger tw-px-1.5 tw-text-center tw-text-xs tw-leading-[18px] tw-text-white max-[960px]:tw-absolute max-[960px]:tw-ml-6 max-[960px]:tw-mb-6'
          }
        >
          {badge > 99 ? '99+' : badge}
        </b>
      ) : null}
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
    <nav
      className={
        'community-mobile-nav tw-hidden max-[620px]:tw-grid max-[620px]:tw-grid-cols-7 max-[620px]:tw-border-t max-[620px]:tw-border-community-border max-[620px]:tw-bg-community-bg2 [&>button]:tw-relative [&>button]:tw-flex [&>button]:tw-min-w-0 [&>button]:tw-flex-col [&>button]:tw-items-center [&>button]:tw-justify-center [&>button]:tw-gap-[3px] [&>button]:tw-border-0 [&>button]:tw-bg-transparent [&>button]:tw-px-1 [&>button]:tw-text-xs [&>button]:tw-text-community-muted [&>button]:tw-cursor-pointer [&>button]:tw-transition-[background-color,color,transform] [&>button]:tw-duration-180 hover:[&>button]:tw-bg-community-accent-bg hover:[&>button]:tw-text-community-accent-light active:[&>button]:tw-scale-95 [&>button.is-active]:tw-bg-community-accent-bg [&>button.is-active]:tw-text-community-accent-light [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [&_svg]:tw-transition-transform [&_svg]:tw-duration-180 hover:[&_svg]:tw-scale-110'
      }
    >
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
        active={page === 'bookmarks'}
        icon="bookmark"
        label={ja ? '保存' : 'Saved'}
        onClick={() => go('bookmarks')}
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
