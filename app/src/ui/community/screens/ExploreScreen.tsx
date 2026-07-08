import { useEffect, useRef } from 'react';
import { ALL_TAG, COMMUNITY_INPUT_LIMITS } from '../constants';
import type { CommunityPost, CommunityUser } from '../types';
import { Avatar } from '../components/Avatar';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { Empty } from '../components/Empty';
import { Glyph } from '../components/Glyph';
import { PostCard } from '../components/PostCard';
import { cn } from '../../../lib/cn';

export function ExploreScreen({
  posts,
  users,
  loading,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  query,
  tag,
  tags,
  ja,
  title,
  description,
  setQuery,
  setTag,
  onOpenProfile,
  onOpen,
  onLike,
  onBookmark,
  onImpression,
}: {
  posts: CommunityPost[];
  users: CommunityUser[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  query: string;
  tag: string;
  tags: string[];
  ja: boolean;
  title?: string;
  description?: string;
  setQuery: (value: string) => void;
  setTag: (value: string) => void;
  onOpenProfile: (loginId: string) => void;
  onOpen: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
  onBookmark: (post: CommunityPost) => void;
  onImpression: (post: CommunityPost) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || !onLoadMore || loading || loadingMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const root = node.closest('.community-scroll');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { root: root instanceof Element ? root : null, rootMargin: '240px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore, posts.length]);

  return (
    <main
      className={
        'community-scroll tw-min-h-0 tw-min-w-0 tw-overflow-auto [scrollbar-gutter:stable]'
      }
    >
      <div
        className={
          'community-content tw-mx-auto tw-w-full tw-max-w-[1120px] tw-px-6 tw-pb-14 tw-pt-6 max-[960px]:tw-px-4 max-[620px]:tw-px-3 max-[620px]:tw-pb-12'
        }
      >
        <header
          className={
            'community-screen-heading tw-mb-5 tw-flex tw-items-end tw-justify-between tw-gap-6 max-[620px]:tw-items-start max-[620px]:tw-gap-3 max-[420px]:tw-grid [&>div]:tw-min-w-0 [&_h1]:tw-m-0 [&_h1]:tw-text-[clamp(22px,2.5vw,28px)] [&_h1]:tw-font-bold [&_h1]:tw-leading-tight [&_h1]:tw-tracking-[-.02em] [&_h1]:tw-text-community-bright max-[620px]:[&_h1]:tw-text-2xl [&_p]:tw-mb-0 [&_p]:tw-mt-2 [&_p]:tw-max-w-[720px] [&_p]:tw-text-sm [&_p]:tw-text-community-muted [&>button]:tw-inline-flex [&>button]:tw-min-h-10 [&>button]:tw-min-w-[112px] [&>button]:tw-flex-none [&>button]:tw-items-center [&>button]:tw-justify-center [&>button]:tw-gap-2 [&>button]:tw-whitespace-nowrap [&>button]:tw-rounded-lg [&>button]:tw-border-0 [&>button]:tw-bg-community-accent [&>button]:tw-px-4 [&>button]:tw-font-bold [&>button]:tw-text-community-on-accent [&>button]:tw-cursor-pointer [&>button_svg]:tw-h-4 [&>button_svg]:tw-w-4 max-[420px]:[&>button]:tw-justify-self-start'
          }
        >
          <div>
            <h1>{title || (ja ? '見つける' : 'Explore')}</h1>
            <p>
              {description ||
                (ja
                  ? 'キーワードや本文のハッシュタグから活動を探せます。'
                  : 'Find activities by keyword or hashtag.')}
            </p>
          </div>
        </header>
        <label
          className={
            'community-search tw-flex tw-h-11 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg2 tw-px-3 tw-transition-[border-color,box-shadow,background-color] tw-duration-200 focus-within:tw-border-community-accent focus-within:tw-bg-community-bg3 focus-within:tw-shadow-[0_0_0_3px_color-mix(in_srgb,var(--p-accent)_22%,transparent)] [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-flex-none [&_svg]:tw-fill-none [&_svg]:tw-stroke-community-muted [&_svg]:tw-transition-[stroke,transform] [&_svg]:tw-duration-200 focus-within:[&_svg]:tw-stroke-community-accent-light focus-within:[&_svg]:tw-scale-110 [&_input]:tw-min-w-0 [&_input]:tw-w-full [&_input]:tw-border-0 [&_input]:tw-bg-transparent [&_input]:tw-text-sm [&_input]:tw-text-community-text [&_input]:tw-outline-none'
          }
        >
          <Glyph name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={COMMUNITY_INPUT_LIMITS.search}
            placeholder={ja ? '投稿・アカウントを検索' : 'Search posts and accounts'}
          />
        </label>
        <div
          className={
            'community-chips tw-my-3 tw-mb-4 tw-flex tw-gap-2 tw-overflow-x-auto tw-pb-1 [&>button]:tw-min-h-9 [&>button]:tw-flex-none [&>button]:tw-rounded-full [&>button]:tw-border [&>button]:tw-border-community-border [&>button]:tw-bg-community-bg2 [&>button]:tw-px-3 [&>button]:tw-text-[13px] [&>button]:tw-text-community-muted [&>button]:tw-cursor-pointer [&>button]:tw-transition-[transform,border-color,background-color,color,box-shadow] [&>button]:tw-duration-180 hover:[&>button]:tw-translate-y-[-1px] hover:[&>button]:tw-border-community-accent hover:[&>button]:tw-bg-community-accent-bg hover:[&>button]:tw-text-community-accent-light active:[&>button]:tw-scale-95 [&>button.is-active]:tw-border-community-accent [&>button.is-active]:tw-bg-community-accent-bg [&>button.is-active]:tw-text-community-accent-light [&>button.is-active]:tw-shadow-[0_0_0_1px_color-mix(in_srgb,var(--p-accent)_35%,transparent)]'
          }
        >
          {tags.map((item) => (
            <button
              className={cn(tag === item && 'is-active')}
              key={item}
              onClick={() => setTag(item)}
            >
              {item === ALL_TAG ? (ja ? 'すべて' : 'All') : `#${item}`}
            </button>
          ))}
        </div>
        <div
          className={
            'community-result tw-mb-3 tw-flex tw-items-center tw-justify-between tw-gap-4 tw-text-[13px] [&>span]:tw-text-community-muted'
          }
        >
          <strong>{ja ? '投稿' : 'Posts'}</strong>
          <span>{loading ? '—' : `${posts.length}${ja ? '件' : ''}`}</span>
        </div>
        {users.length ? (
          <section
            className={
              'community-account-results tw-mb-4 tw-grid tw-gap-3 tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg2 tw-p-3 [&>header]:tw-flex [&>header]:tw-justify-between [&>header]:tw-text-[13px] [&>header]:tw-text-community-muted [&>div]:tw-grid [&>div]:tw-grid-cols-[repeat(auto-fill,minmax(220px,1fr))] [&>div]:tw-gap-2 [&_button]:tw-flex [&_button]:tw-min-w-0 [&_button]:tw-items-center [&_button]:tw-gap-3 [&_button]:tw-rounded-lg [&_button]:tw-border [&_button]:tw-border-community-border [&_button]:tw-bg-community-bg3 [&_button]:tw-p-3 [&_button]:tw-text-left [&_button]:tw-text-community-text [&_button]:tw-cursor-pointer [&_button]:tw-transition-[transform,border-color,background-color,box-shadow] [&_button]:tw-duration-180 hover:[&_button]:tw-translate-y-[-2px] hover:[&_button]:tw-border-community-accent hover:[&_button]:tw-bg-community-accent-bg hover:[&_button]:tw-shadow-community-card active:[&_button]:tw-translate-y-0 active:[&_button]:tw-scale-[.98] [&_button>span]:tw-grid [&_button>span]:tw-min-w-0 [&_button>span]:tw-gap-0.5 [&_strong]:tw-text-community-bright [&_small]:tw-text-community-muted [&_em]:tw-text-xs [&_em]:tw-not-italic [&_em]:tw-text-community-accent-light'
            }
          >
            <header>
              <strong>{ja ? 'アカウント' : 'Accounts'}</strong>
              <span>
                {users.length}
                {ja ? '件' : ''}
              </span>
            </header>
            <div>
              {users.map((item) => (
                <button type="button" key={item.id} onClick={() => onOpenProfile(item.loginId)}>
                  <Avatar user={item} />
                  <span>
                    <strong className="tw-flex tw-min-w-0 tw-items-center tw-gap-1">
                      {item.displayName}
                      {item.verified ? <VerifiedBadge ja={ja} /> : null}
                    </strong>
                    <small>@{item.loginId}</small>
                    {(item.profileTags ?? []).length ? (
                      <em>{item.profileTags.map((profileTag) => `#${profileTag}`).join(' ')}</em>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {loading ? (
          <Empty ja={ja} loading />
        ) : posts.length ? (
          <>
            <div
              className={'community-grid tw-grid tw-grid-cols-2 tw-gap-4 max-[620px]:tw-grid-cols-1'}
            >
              {posts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  ja={ja}
                  index={index}
                  onOpen={() => onOpen(post)}
                  onLike={() => onLike(post)}
                  onBookmark={() => onBookmark(post)}
                  onImpression={() => onImpression(post)}
                />
              ))}
            </div>
            <div ref={sentinelRef} className="tw-h-px tw-w-full" aria-hidden />
            {loadingMore ? (
              <p className="tw-mt-4 tw-text-center tw-text-sm tw-text-community-muted">
                {ja ? '読み込み中…' : 'Loading…'}
              </p>
            ) : null}
          </>
        ) : (
          <Empty ja={ja} />
        )}
      </div>
    </main>
  );
}
