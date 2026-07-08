import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Empty } from '../components/Empty';
import { Glyph } from '../components/Glyph';
import { PostCard } from '../components/PostCard';
import { SocialIcon } from '../components/SocialIcon';
import { VerifiedBadge } from '../components/VerifiedBadge';
import type { CommunityPost, CommunityUser } from '../types';
import { socialEntries, websiteLabel } from '../utils';
import { cn } from '../../../lib/cn';

export function ProfileScreen({
  user,
  viewer,
  posts,
  ja,
  isOwn,
  onEdit,
  onSettings,
  onCreate,
  onOpen,
  onLike,
  onBookmark,
  onImpression,
  onFollow,
  onConnections,
  onTagClick,
}: {
  user: CommunityUser;
  viewer: CommunityUser | null;
  posts: CommunityPost[];
  ja: boolean;
  isOwn: boolean;
  onEdit: () => void;
  onSettings: () => void;
  onCreate: () => void;
  onOpen: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
  onBookmark: (post: CommunityPost) => void;
  onImpression: (post: CommunityPost) => void;
  onFollow: () => void;
  onConnections: (relation: 'followers' | 'following') => void;
  onTagClick: (tag: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [headerBroken, setHeaderBroken] = useState(false);
  const shown = !isOwn || filter === 'all' ? posts : posts.filter((post) => post.status === filter);
  const profileTags = user.profileTags ?? [];
  const userSocialEntries = socialEntries(user.socialLinks);
  const unsetText = ja ? '未設定' : 'Not set';
  const postStatCount = user.postCount ?? posts.filter((post) => post.status === 'approved').length;
  const likesReceivedStat =
    user.likesReceived ??
    posts.filter((post) => post.status === 'approved').reduce((sum, post) => sum + post.likeCount, 0);
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
        <section
          className={
            'community-profile tw-mb-5 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-community-border tw-bg-community-bg2'
          }
        >
          <div
            className={
              'community-profile-banner tw-relative tw-h-[clamp(170px,22vw,260px)] tw-overflow-hidden tw-bg-community-accent-bg [&>img]:tw-relative [&>img]:tw-z-10 [&>img]:tw-block [&>img]:tw-h-full [&>img]:tw-w-full [&>img]:tw-object-cover'
            }
          >
            {user.headerUrl && !headerBroken ? (
              <img src={user.headerUrl} alt="" onError={() => setHeaderBroken(true)} />
            ) : (
              <>
                <div
                  className={'tw-absolute tw-inset-0 tw-bg-community-accent tw-opacity-[0.08]'}
                />
                <div
                  className={
                    'tw-absolute tw-inset-y-0 tw-left-0 tw-w-[34%] tw-skew-x-[-16deg] tw-bg-community-accent tw-opacity-[0.10]'
                  }
                />
                <div
                  className={
                    'tw-absolute tw-inset-y-0 tw-right-[-8%] tw-w-[42%] tw-skew-x-[-16deg] tw-bg-community-accent-light tw-opacity-[0.12]'
                  }
                />
              </>
            )}
          </div>
          <div
            className={
              'community-profile-info tw-relative tw-z-20 tw-grid tw-grid-cols-[auto_minmax(0,1fr)_auto] tw-items-start tw-gap-5 tw-px-6 tw-pb-5 max-[620px]:tw-grid-cols-[auto_minmax(0,1fr)] max-[620px]:tw-gap-3 max-[620px]:tw-px-4 [&>.community-avatar]:tw-relative [&>.community-avatar]:tw-z-30 [&>.community-avatar]:tw-mt-[-42px] [&>.community-avatar]:tw-shadow-[0_0_0_5px_var(--p-bg2)]'
            }
          >
            <Avatar user={user} large />
            <div className={'community-profile-copy tw-grid tw-min-w-0 tw-gap-3 tw-pt-5'}>
              <div
                className={
                  'community-profile-identity tw-grid tw-min-w-0 tw-gap-0.5 tw-pb-1 [&_h1]:tw-m-0 [&_h1]:tw-overflow-wrap-anywhere [&_h1]:tw-text-[clamp(24px,2.4vw,32px)] [&_h1]:tw-leading-tight [&_h1]:tw-text-community-bright max-[620px]:[&_h1]:tw-text-xl [&>span]:tw-text-sm [&>span]:tw-text-community-muted'
                }
              >
                <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-2">
                  <h1>{user.displayName}</h1>
                  {user.verified ? <VerifiedBadge ja={ja} large /> : null}
                </div>
                <span>@{user.loginId}</span>
              </div>
              <p
                className={
                  'community-profile-bio tw-m-0 tw-max-w-[68ch] tw-whitespace-pre-wrap tw-break-words tw-text-sm tw-leading-7 tw-text-community-text'
                }
              >
                {user.bio || (ja ? '自己紹介はまだありません。' : 'No bio yet.')}
              </p>
            </div>
            <div
              className={
                'community-profile-actions tw-flex tw-flex-wrap tw-justify-end tw-gap-2 tw-pt-5 max-[620px]:tw-col-span-full max-[620px]:tw-pt-0 [&_button]:tw-min-h-10 [&_button]:tw-min-w-[96px] [&_button]:tw-whitespace-nowrap [&_button]:tw-rounded-lg [&_button]:tw-border [&_button]:tw-border-community-accent [&_button]:tw-bg-community-accent [&_button]:tw-px-4 [&_button]:tw-font-bold [&_button]:tw-text-community-on-accent [&_button]:tw-cursor-pointer [&_button]:tw-transition-[transform,filter,box-shadow] [&_button]:tw-duration-200 hover:[&_button]:tw-translate-y-[-2px] hover:[&_button]:tw-brightness-110 hover:[&_button]:tw-shadow-[0_10px_24px_color-mix(in_srgb,var(--p-accent)_35%,transparent)] active:[&_button]:tw-translate-y-0 active:[&_button]:tw-scale-[.98] max-[620px]:[&_button]:tw-flex-1 [&_button.is-secondary]:tw-border-community-border [&_button.is-secondary]:tw-bg-community-bg3 [&_button.is-secondary]:tw-text-community-text hover:[&_button.is-secondary]:tw-border-community-accent hover:[&_button.is-secondary]:tw-bg-community-accent-bg hover:[&_button.is-secondary]:tw-text-community-accent-light hover:[&_button.is-secondary]:tw-shadow-none [&_button.is-following]:tw-bg-community-bg3 [&_button.is-following]:tw-text-community-accent-light'
              }
            >
              {isOwn ? (
                <>
                  <button type="button" className="is-secondary" onClick={onSettings}>
                    {ja ? '設定' : 'Settings'}
                  </button>
                  <button type="button" onClick={onEdit}>
                    {ja ? '編集' : 'Edit'}
                  </button>
                </>
              ) : viewer ? (
                <button type="button" className={cn(user.followedByMe && 'is-following')} onClick={onFollow}>
                  {user.followedByMe
                    ? ja
                      ? 'フォロー中'
                      : 'Following'
                    : ja
                      ? 'フォロー'
                      : 'Follow'}
                </button>
              ) : (
                <button type="button" onClick={onFollow}>
                  {ja ? 'ログインしてフォロー' : 'Log in to follow'}
                </button>
              )}
            </div>
          </div>
          <div
            className={
              'community-profile-body tw-grid tw-grid-cols-[minmax(0,1fr)_auto] tw-items-start tw-gap-4 tw-border-t tw-border-community-border tw-px-6 tw-pb-5 tw-pt-4 max-[760px]:tw-grid-cols-1 max-[620px]:tw-px-4'
            }
          >
            <div className="community-profile-details tw-grid tw-min-w-0 tw-gap-3">
              <section className="tw-grid tw-gap-1">
                <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-[11px] tw-font-bold tw-tracking-[.06em] tw-text-community-muted [&_.community-glyph]:tw-h-3.5 [&_.community-glyph]:tw-w-3.5">
                  <Glyph name="school" />
                  {ja ? '所属' : 'Program'}
                </span>
                {user.academicGroup || user.department ? (
                  <div className="tw-grid tw-gap-0.5">
                    {user.academicGroup ? (
                      <p className="tw-m-0 tw-text-[14px] tw-font-bold tw-leading-tight tw-text-community-bright">
                        {user.academicGroup}
                      </p>
                    ) : null}
                    {user.department ? (
                      <p
                        className={
                          user.academicGroup
                            ? 'tw-m-0 tw-text-[12px] tw-leading-tight tw-text-community-muted'
                            : 'tw-m-0 tw-text-[14px] tw-font-bold tw-leading-tight tw-text-community-bright'
                        }
                      >
                        {user.department}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="tw-m-0 tw-text-[13px] tw-text-community-muted">{unsetText}</p>
                )}
              </section>

              <section className="tw-grid tw-gap-1.5 tw-border-t tw-border-community-border-light tw-pt-3">
                <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-[11px] tw-font-bold tw-tracking-[.06em] tw-text-community-muted [&_.community-glyph]:tw-h-3.5 [&_.community-glyph]:tw-w-3.5">
                  <Glyph name="tag" />
                  {ja ? 'プロフィールタグ' : 'Profile tags'}
                </span>
                {profileTags.length ? (
                  <div
                    className="community-profile-tags tw-flex tw-flex-wrap tw-gap-1.5"
                    aria-label={ja ? 'プロフィールタグ' : 'Profile tags'}
                  >
                    {profileTags.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => onTagClick(tag)}
                        className="tw-rounded-md tw-border tw-border-transparent tw-bg-community-accent-bg tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-bold tw-leading-5 tw-text-community-accent-light tw-cursor-pointer tw-transition-[border-color,background-color,color] tw-duration-150 hover:tw-border-community-accent hover:tw-text-community-bright"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="tw-m-0 tw-text-[13px] tw-text-community-muted">{unsetText}</p>
                )}
              </section>

              <section className="tw-grid tw-gap-1.5 tw-border-t tw-border-community-border-light tw-pt-3">
                <span className="tw-inline-flex tw-items-center tw-gap-1.5 tw-text-[11px] tw-font-bold tw-tracking-[.06em] tw-text-community-muted [&_.community-glyph]:tw-h-3.5 [&_.community-glyph]:tw-w-3.5">
                  <Glyph name="link" />
                  {ja ? 'リンク' : 'Links'}
                </span>
                {user.websiteUrl || userSocialEntries.length ? (
                  <div className="tw-flex tw-min-w-0 tw-flex-wrap tw-items-center tw-gap-1.5">
                    {user.websiteUrl ? (
                      <a
                        className="community-profile-link tw-inline-flex tw-max-w-full tw-items-center tw-gap-1 tw-truncate tw-text-[13px] tw-font-semibold tw-text-community-accent-light tw-no-underline hover:tw-text-community-bright"
                        href={user.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                      >
                        <span aria-hidden="true">↗</span>
                        {websiteLabel(user.websiteUrl)}
                      </a>
                    ) : null}
                    {userSocialEntries.map((entry) => (
                      <a
                        key={entry.key}
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                        title={entry.label}
                        className="tw-inline-flex tw-h-7 tw-items-center tw-gap-1.5 tw-rounded-md tw-border tw-border-community-border tw-bg-community-bg3 tw-px-2 tw-text-[11px] tw-font-bold tw-text-community-text tw-no-underline tw-transition-[border-color,background-color,color] tw-duration-150 hover:tw-border-community-accent hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light [&_.community-social-icon]:tw-h-[16px] [&_.community-social-icon]:tw-w-[16px] [&_.community-social-icon_svg]:tw-h-2.5 [&_.community-social-icon_svg]:tw-w-2.5"
                      >
                        <SocialIcon platform={entry.key} />
                        <span>{entry.label}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="tw-m-0 tw-text-[13px] tw-text-community-muted">{unsetText}</p>
                )}
              </section>
            </div>

            <aside
              className={
                'community-profile-stats tw-min-w-[176px] tw-rounded-xl tw-border tw-border-community-border tw-bg-[color-mix(in_srgb,var(--p-bg3)_42%,transparent)] tw-px-3.5 tw-py-2.5 max-[760px]:tw-min-w-0 [&>*]:tw-flex [&>*]:tw-min-h-8 [&>*]:tw-items-center [&>*]:tw-justify-between [&>*]:tw-gap-3 [&>*]:tw-border-0 [&>*]:tw-border-b [&>*]:tw-border-community-border-light [&>*]:tw-bg-transparent [&>*]:tw-px-0 [&>*]:tw-py-1.5 [&>*]:tw-text-[12px] [&>*]:tw-text-community-muted [&>button]:tw-w-full [&>button]:tw-cursor-pointer [&>button]:tw-text-left [&>button]:tw-transition-colors hover:[&>button]:tw-text-community-accent-light [&>*:last-child]:tw-border-b-0 [&_em]:tw-inline-flex [&_em]:tw-items-center [&_em]:tw-gap-1.5 [&_em]:tw-not-italic [&_.community-glyph]:tw-h-3.5 [&_.community-glyph]:tw-w-3.5 [&_strong]:tw-text-[14px] [&_strong]:tw-font-bold [&_strong]:tw-tabular-nums [&_strong]:tw-text-community-bright'
              }
            >
              <div>
                <em>
                  <Glyph name="image" />
                  {ja ? '投稿' : 'Posts'}
                </em>
                <strong>{postStatCount}</strong>
              </div>
              <div>
                <em>
                  <Glyph name="heart" />
                  {ja ? 'いいね' : 'Likes'}
                </em>
                <strong>{likesReceivedStat}</strong>
              </div>
              {isOwn ? (
                <div>
                  <em>
                    <Glyph name="clock" />
                    {ja ? '審査中' : 'Pending'}
                  </em>
                  <strong>{posts.filter((post) => post.status === 'pending').length}</strong>
                </div>
              ) : null}
              <button type="button" onClick={() => onConnections('followers')}>
                <em>
                  <Glyph name="users" />
                  {ja ? 'フォロワー' : 'Followers'}
                </em>
                <strong>{user.followerCount ?? 0}</strong>
              </button>
              <button type="button" onClick={() => onConnections('following')}>
                <em>
                  <Glyph name="user" />
                  {ja ? 'フォロー中' : 'Following'}
                </em>
                <strong>{user.followingCount ?? 0}</strong>
              </button>
            </aside>
          </div>
          {isOwn && user.profileState === 'editing' ? (
            <div
              className={
                'community-notice tw-mx-4 tw-mb-4 tw-rounded-lg tw-bg-community-accent-bg tw-p-3 tw-text-[13px] tw-text-community-accent-light'
              }
            >
              {ja ? 'プロフィールの変更を審査中です。' : 'Profile changes are under review.'}
            </div>
          ) : null}
        </section>
        {isOwn ? (
          <nav
            className={
              'community-profile-tabs tw-mb-4 tw-flex tw-gap-2 tw-overflow-x-auto [&>button]:tw-min-h-9 [&>button]:tw-flex-none [&>button]:tw-whitespace-nowrap [&>button]:tw-rounded-full [&>button]:tw-border [&>button]:tw-border-community-border [&>button]:tw-bg-community-bg2 [&>button]:tw-px-3 [&>button]:tw-text-[13px] [&>button]:tw-font-normal [&>button]:tw-text-community-muted [&>button]:tw-cursor-pointer [&>button]:tw-transition-[transform,border-color,background-color,color,box-shadow] [&>button]:tw-duration-180 hover:[&>button]:tw-translate-y-[-1px] hover:[&>button]:tw-border-community-accent hover:[&>button]:tw-bg-community-accent-bg hover:[&>button]:tw-text-community-accent-light active:[&>button]:tw-scale-95 [&>button.is-active]:tw-border-community-accent [&>button.is-active]:tw-bg-community-accent-bg [&>button.is-active]:tw-text-community-accent-light [&>button.is-active]:tw-shadow-[0_0_0_1px_color-mix(in_srgb,var(--p-accent)_35%,transparent)]'
            }
          >
            {(['all', 'approved', 'pending', 'rejected'] as const).map((item) => (
              <button
                className={cn(filter === item && 'is-active')}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item === 'all'
                  ? ja
                    ? 'すべて'
                    : 'All'
                  : item === 'approved'
                    ? ja
                      ? '投稿'
                      : 'Posts'
                    : item === 'pending'
                      ? ja
                        ? '審査中'
                        : 'Pending'
                      : ja
                        ? '非公開'
                        : 'Rejected'}
              </button>
            ))}
          </nav>
        ) : null}
        {shown.length ? (
          <div
            className={'community-grid tw-grid tw-grid-cols-2 tw-gap-4 max-[620px]:tw-grid-cols-1'}
          >
            {shown.map((post, index) => (
              <div
                className={
                  'community-own-post tw-relative tw-min-w-0 [&>span]:tw-absolute [&>span]:tw-right-3 [&>span]:tw-top-3 [&>span]:tw-rounded-full [&>span]:tw-bg-[color-mix(in_srgb,var(--p-bg)_88%,transparent)] [&>span]:tw-px-2 [&>span]:tw-py-1 [&>span]:tw-text-xs [&>span]:tw-font-bold [&>span]:tw-text-community-bright [&>span]:tw-backdrop-blur [&>span.is-pending]:tw-text-[#e7a92f] [&>span.is-rejected]:tw-text-community-danger'
                }
                key={post.id}
              >
                <PostCard
                  post={post}
                  ja={ja}
                  index={index}
                  onOpen={() => onOpen(post)}
                  onLike={() => onLike(post)}
                  onBookmark={() => onBookmark(post)}
                  onImpression={() => onImpression(post)}
                />
                <span className={cn(`is-${post.status}`)}>
                  {post.status === 'approved'
                    ? ja
                      ? '投稿'
                      : 'Post'
                    : post.status === 'pending'
                      ? ja
                        ? '審査中'
                        : 'Pending'
                      : ja
                        ? '非公開'
                        : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty ja={ja} action={onCreate} />
        )}
      </div>
    </main>
  );
}
