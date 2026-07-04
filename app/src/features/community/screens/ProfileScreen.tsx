import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Empty } from '../components/Empty';
import { PostCard } from '../components/PostCard';
import { SocialIcon } from '../components/SocialIcon';
import type { CommunityPost, CommunityUser } from '../types';
import { socialEntries, websiteLabel } from '../utils';
import { cn } from '../classNames';

export function ProfileScreen({
  user,
  viewer,
  posts,
  ja,
  isOwn,
  onEdit,
  onCreate,
  onOpen,
  onLike,
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
  onCreate: () => void;
  onOpen: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
  onFollow: () => void;
  onConnections: (relation: 'followers' | 'following') => void;
  onTagClick: (tag: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const shown = !isOwn || filter === 'all' ? posts : posts.filter((post) => post.status === filter);
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
            'community-profile tw-mb-5 tw-overflow-hidden tw-rounded-2xl tw-border tw-border-community-border tw-bg-community-bg2 tw-shadow-community-card'
          }
        >
          <div
            className={
              'community-profile-banner tw-h-[clamp(170px,22vw,260px)] tw-overflow-hidden tw-bg-gradient-to-br tw-from-community-accent-bg tw-to-community-bg3 [&>img]:tw-block [&>img]:tw-h-full [&>img]:tw-w-full [&>img]:tw-object-cover'
            }
          >
            {user.headerUrl ? (
              <img
                src={user.headerUrl}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
          </div>
          <div
            className={
              'community-profile-info tw-relative tw-grid tw-grid-cols-[auto_minmax(0,1fr)_auto] tw-items-start tw-gap-5 tw-px-6 tw-pb-5 max-[620px]:tw-grid-cols-[auto_minmax(0,1fr)] max-[620px]:tw-gap-3 max-[620px]:tw-px-4 [&>.community-avatar]:tw-mt-[-42px] [&>.community-avatar]:tw-shadow-[0_0_0_5px_var(--p-bg2)]'
            }
          >
            <Avatar user={user} large />
            <div className={'community-profile-copy tw-grid tw-min-w-0 tw-gap-3 tw-pt-5'}>
              <div
                className={
                  'community-profile-identity tw-grid tw-min-w-0 tw-gap-0.5 tw-pb-1 [&_h1]:tw-m-0 [&_h1]:tw-overflow-wrap-anywhere [&_h1]:tw-text-[clamp(24px,2.4vw,32px)] [&_h1]:tw-leading-tight [&_h1]:tw-text-community-bright max-[620px]:[&_h1]:tw-text-xl [&>span]:tw-text-sm [&>span]:tw-text-community-muted'
                }
              >
                <h1>{user.displayName}</h1>
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
                'community-profile-actions tw-pt-5 max-[620px]:tw-col-span-full max-[620px]:tw-pt-0 [&_button]:tw-min-h-10 [&_button]:tw-min-w-[96px] [&_button]:tw-whitespace-nowrap [&_button]:tw-rounded-lg [&_button]:tw-border [&_button]:tw-border-community-accent [&_button]:tw-bg-community-accent [&_button]:tw-px-4 [&_button]:tw-font-bold [&_button]:tw-text-community-bg [&_button]:tw-cursor-pointer max-[620px]:[&_button]:tw-w-full [&_button.is-following]:tw-bg-community-bg3 [&_button.is-following]:tw-text-community-accent-light'
              }
            >
              {isOwn ? (
                <button onClick={onEdit}>{ja ? '編集' : 'Edit'}</button>
              ) : viewer ? (
                <button className={cn(user.followedByMe && 'is-following')} onClick={onFollow}>
                  {user.followedByMe
                    ? ja
                      ? 'フォロー中'
                      : 'Following'
                    : ja
                      ? 'フォロー'
                      : 'Follow'}
                </button>
              ) : (
                <button onClick={onFollow}>
                  {ja ? 'ログインしてフォロー' : 'Log in to follow'}
                </button>
              )}
            </div>
          </div>
          <div
            className={
              'community-profile-body tw-grid tw-grid-cols-[minmax(0,1fr)_250px] tw-items-stretch tw-gap-4 tw-px-6 tw-pb-6 max-[760px]:tw-grid-cols-1 max-[620px]:tw-px-4'
            }
          >
            <div
              className={
                'community-profile-details tw-grid tw-content-start tw-overflow-hidden tw-rounded-xl tw-border tw-border-community-border tw-bg-[color-mix(in_srgb,var(--p-bg3)_38%,transparent)] [&>section]:tw-max-w-none [&>section]:tw-border-0 [&>section]:tw-border-b [&>section]:tw-border-community-border-light [&>section]:tw-bg-transparent [&>section]:tw-px-4 [&>section]:tw-py-3.5 [&>section:last-child]:tw-border-b-0'
              }
            >
              {user.academicGroup && user.department ? (
                <section
                  className={
                    'community-profile-academic tw-grid tw-max-w-[640px] tw-grid-cols-[140px_minmax(0,1fr)] tw-items-center tw-gap-3 max-[620px]:tw-grid-cols-1 [&>span]:tw-text-[11px] [&>span]:tw-font-extrabold [&>span]:tw-tracking-[.08em] [&>span]:tw-text-community-muted [&>div]:tw-grid [&>div]:tw-min-w-0 [&>div]:tw-gap-0.5 [&_strong]:tw-break-words [&_strong]:tw-text-base [&_strong]:tw-text-community-bright [&_small]:tw-break-words [&_small]:tw-text-[13px] [&_small]:tw-text-community-accent-light'
                  }
                >
                  <span>{ja ? '所属' : 'Program'}</span>
                  <div>
                    <strong>{user.academicGroup}</strong>
                    <small>{user.department}</small>
                  </div>
                </section>
              ) : null}
              {(user.profileTags ?? []).length ? (
                <section
                  className={
                    'community-profile-tag-section tw-grid tw-max-w-[820px] tw-grid-cols-[140px_minmax(0,1fr)] tw-items-center tw-gap-3 max-[620px]:tw-grid-cols-1 [&>span]:tw-text-[11px] [&>span]:tw-font-extrabold [&>span]:tw-tracking-[.08em] [&>span]:tw-text-community-muted'
                  }
                >
                  <span>{ja ? 'プロフィールタグ' : 'Profile tags'}</span>
                  <div
                    className={
                      'community-profile-tags tw-flex tw-flex-wrap tw-gap-[7px] [&>button]:tw-rounded-full [&>button]:tw-border [&>button]:tw-border-community-border [&>button]:tw-bg-community-accent-bg [&>button]:tw-px-2.5 [&>button]:tw-py-1 [&>button]:tw-text-xs [&>button]:tw-font-bold [&>button]:tw-text-community-accent-light [&>button]:tw-cursor-pointer hover:[&>button]:tw-border-community-accent'
                    }
                    aria-label={ja ? 'プロフィールタグ' : 'Profile tags'}
                  >
                    {(user.profileTags ?? []).map((tag) => (
                      <button type="button" key={tag} onClick={() => onTagClick(tag)}>
                        #{tag}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {user.websiteUrl || socialEntries(user.socialLinks).length ? (
                <section
                  className={
                    'community-profile-link-section tw-grid tw-max-w-[820px] tw-grid-cols-[140px_minmax(0,1fr)] tw-items-start tw-gap-3 max-[620px]:tw-grid-cols-1 [&>span]:tw-pt-1 [&>span]:tw-text-[11px] [&>span]:tw-font-extrabold [&>span]:tw-tracking-[.08em] [&>span]:tw-text-community-muted [&>div]:tw-grid [&>div]:tw-min-w-0 [&>div]:tw-gap-2'
                  }
                >
                  <span>{ja ? 'リンク' : 'Links'}</span>
                  <div>
                    {user.websiteUrl ? (
                      <a
                        className={
                          'community-profile-link tw-inline-flex tw-items-center tw-gap-1 tw-break-words tw-text-[13px] tw-text-community-accent-light tw-no-underline'
                        }
                        href={user.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span aria-hidden="true">↗</span>
                        {websiteLabel(user.websiteUrl)}
                      </a>
                    ) : null}
                    {socialEntries(user.socialLinks).length ? (
                      <div
                        className={
                          'community-profile-socials tw-flex tw-flex-wrap tw-gap-2 [&>a]:tw-inline-flex [&>a]:tw-min-h-[34px] [&>a]:tw-items-center [&>a]:tw-gap-2 [&>a]:tw-rounded-full [&>a]:tw-border [&>a]:tw-border-community-border [&>a]:tw-bg-community-bg3 [&>a]:tw-py-0 [&>a]:tw-pl-2 [&>a]:tw-pr-3 [&>a]:tw-text-[13px] [&>a]:tw-font-bold [&>a]:tw-text-community-text [&>a]:tw-no-underline hover:[&>a]:tw-border-community-accent hover:[&>a]:tw-text-community-accent-light'
                        }
                        aria-label={ja ? '外部リンク' : 'Social links'}
                      >
                        {socialEntries(user.socialLinks).map((entry) => (
                          <a
                            key={entry.key}
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <SocialIcon platform={entry.key} />
                            <span>{entry.label}</span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
            <aside
              className={
                'community-profile-stats tw-grid tw-content-start tw-overflow-hidden tw-rounded-xl tw-border tw-border-community-border tw-bg-[color-mix(in_srgb,var(--p-bg3)_38%,transparent)] [&>span]:tw-flex [&>span]:tw-min-h-[50px] [&>span]:tw-items-center [&>span]:tw-justify-between [&>span]:tw-gap-3 [&>span]:tw-border-b [&>span]:tw-border-community-border-light [&>span]:tw-px-4 [&>span]:tw-text-[13px] [&>span]:tw-text-community-muted [&>button]:tw-flex [&>button]:tw-min-h-[50px] [&>button]:tw-items-center [&>button]:tw-justify-between [&>button]:tw-gap-3 [&>button]:tw-border-0 [&>button]:tw-border-b [&>button]:tw-border-community-border-light [&>button]:tw-bg-transparent [&>button]:tw-px-4 [&>button]:tw-text-left [&>button]:tw-text-[13px] [&>button]:tw-text-community-muted [&>button]:tw-cursor-pointer hover:[&>button]:tw-bg-community-accent-bg [&>*:last-child]:tw-border-b-0 [&_strong]:tw-text-base [&_strong]:tw-leading-tight [&_strong]:tw-text-community-bright'
              }
            >
              <span>
                <span>{ja ? '投稿' : 'Posts'}</span>
                <strong>{posts.length}</strong>
              </span>
              <span>
                <span>{ja ? '公開中' : 'Published'}</span>
                <strong>
                  {isOwn ? posts.filter((post) => post.status === 'approved').length : posts.length}
                </strong>
              </span>
              {isOwn ? (
                <span>
                  <span>{ja ? '審査中' : 'Pending'}</span>
                  <strong>{posts.filter((post) => post.status === 'pending').length}</strong>
                </span>
              ) : null}
              <button type="button" onClick={() => onConnections('followers')}>
                <span>{ja ? 'フォロワー' : 'Followers'}</span>
                <strong>{user.followerCount ?? 0}</strong>
              </button>
              <button type="button" onClick={() => onConnections('following')}>
                <span>{ja ? 'フォロー中' : 'Following'}</span>
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
              'community-profile-tabs tw-mb-4 tw-flex tw-gap-2 tw-overflow-x-auto [&>button]:tw-min-h-9 [&>button]:tw-flex-none [&>button]:tw-whitespace-nowrap [&>button]:tw-rounded-full [&>button]:tw-border [&>button]:tw-border-community-border [&>button]:tw-bg-community-bg2 [&>button]:tw-px-3 [&>button]:tw-text-[13px] [&>button]:tw-font-normal [&>button]:tw-text-community-muted [&>button]:tw-cursor-pointer [&>button.is-active]:tw-border-community-accent [&>button.is-active]:tw-bg-community-accent-bg [&>button.is-active]:tw-text-community-accent-light'
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
                      ? '公開中'
                      : 'Published'
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
            {shown.map((post) => (
              <div
                className={
                  'community-own-post tw-relative tw-min-w-0 [&>span]:tw-absolute [&>span]:tw-right-3 [&>span]:tw-top-3 [&>span]:tw-rounded-full [&>span]:tw-bg-[color-mix(in_srgb,var(--p-bg)_88%,transparent)] [&>span]:tw-px-2 [&>span]:tw-py-1 [&>span]:tw-text-xs [&>span]:tw-font-bold [&>span]:tw-text-community-bright [&>span]:tw-backdrop-blur [&>span.is-pending]:tw-text-[#e7a92f] [&>span.is-rejected]:tw-text-community-danger'
                }
                key={post.id}
              >
                <PostCard
                  post={post}
                  ja={ja}
                  onOpen={() => onOpen(post)}
                  onLike={() => onLike(post)}
                />
                <span className={cn(`is-${post.status}`)}>
                  {post.status === 'approved'
                    ? ja
                      ? '公開中'
                      : 'Published'
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
