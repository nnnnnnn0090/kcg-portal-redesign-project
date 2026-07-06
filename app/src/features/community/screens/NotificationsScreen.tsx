import type { CommunityNotification } from '../types';
import { Avatar } from '../components/Avatar';
import { Glyph } from '../components/Glyph';
import { cn } from '../../../lib/cn';

export function NotificationsScreen({
  notifications,
  ja,
  onOpenProfile,
}: {
  notifications: CommunityNotification[];
  ja: boolean;
  onOpenProfile: (loginId: string) => void;
}) {
  const notificationText = (item: CommunityNotification) => {
    if (item.type === 'like')
      return ja
        ? `が「${item.post?.title ?? '投稿'}」にいいねしました`
        : `liked “${item.post?.title ?? 'your post'}”`;
    if (item.type === 'follow') return ja ? 'があなたをフォローしました' : 'followed you';
    if (item.type === 'post_approved')
      return ja ? `「${item.post?.title ?? '投稿'}」が承認されました` : `Your post was approved`;
    if (item.type === 'post_rejected')
      return ja ? `「${item.post?.title ?? '投稿'}」が却下されました` : `Your post was rejected`;
    if (item.type === 'comment_approved')
      return ja ? 'コメントが承認されました' : 'Your comment was approved';
    if (item.type === 'comment_rejected')
      return ja ? 'コメントが却下されました' : 'Your comment was rejected';
    if (item.type === 'profile_approved')
      return ja ? 'プロフィール変更が承認されました' : 'Your profile update was approved';
    return ja ? 'プロフィール変更が却下されました' : 'Your profile update was rejected';
  };
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
            <h1>{ja ? '通知' : 'Notifications'}</h1>
            <p>
              {ja ? 'いいねやフォローのお知らせを確認できます。' : 'Likes and follows appear here.'}
            </p>
          </div>
        </header>
        {notifications.length ? (
          <section
            className={
              'community-notifications tw-grid tw-gap-2 [&>article]:tw-grid [&>article]:tw-grid-cols-[minmax(0,1fr)_auto] [&>article]:tw-items-center [&>article]:tw-gap-4 [&>article]:tw-rounded-xl [&>article]:tw-border [&>article]:tw-border-community-border [&>article]:tw-bg-community-bg2 [&>article]:tw-p-4 [&>article]:tw-transition hover:[&>article]:tw-border-[var(--p-border-hover)] hover:[&>article]:tw-bg-community-bg3 [&>article.is-unread]:tw-border-community-accent [&>article.is-unread]:tw-bg-community-accent-bg [&_article>button]:tw-flex [&_article>button]:tw-min-w-0 [&_article>button]:tw-items-center [&_article>button]:tw-gap-3 [&_article>button]:tw-border-0 [&_article>button]:tw-bg-transparent [&_article>button]:tw-p-0 [&_article>button]:tw-text-left [&_article>button]:tw-cursor-pointer [&_article>img]:tw-h-14 [&_article>img]:tw-w-[76px] [&_article>img]:tw-rounded-lg [&_article>img]:tw-object-cover'
            }
          >
            {notifications.map((item) => (
              <article className={cn(!item.read && 'is-unread')} key={item.id}>
                <button type="button" onClick={() => onOpenProfile(item.actor.loginId)}>
                  <Avatar user={item.actor} />
                  <span
                    className={
                      'community-notification-copy tw-grid tw-min-w-0 tw-flex-1 tw-gap-1 [&>em]:tw-overflow-hidden [&>em]:tw-text-ellipsis [&>em]:tw-whitespace-nowrap [&>em]:tw-text-[13px] [&>em]:tw-not-italic [&>em]:tw-text-community-text'
                    }
                  >
                    <span
                      className={
                        'community-notification-head tw-flex tw-min-w-0 tw-items-center tw-justify-between tw-gap-4 [&>strong]:tw-overflow-hidden [&>strong]:tw-text-ellipsis [&>strong]:tw-whitespace-nowrap [&>strong]:tw-text-sm [&>strong]:tw-text-community-bright [&>time]:tw-flex-none [&>time]:tw-text-xs [&>time]:tw-text-community-muted'
                      }
                    >
                      <strong>{item.actor.displayName}</strong>
                      <time>{new Date(item.createdAt).toLocaleString(ja ? 'ja-JP' : 'en-US')}</time>
                    </span>
                    <em>{notificationText(item)}</em>
                  </span>
                </button>
                {item.post?.imageUrl ? <img src={item.post.imageUrl} alt="" /> : null}
              </article>
            ))}
          </section>
        ) : (
          <div
            className={
              'community-empty tw-rounded-2xl tw-border tw-border-dashed tw-border-community-border tw-bg-community-bg2 tw-px-6 tw-py-10 tw-text-center [&>span]:tw-mx-auto [&>span]:tw-mb-3 [&>span]:tw-grid [&>span]:tw-h-11 [&>span]:tw-w-11 [&>span]:tw-place-items-center [&>span]:tw-rounded-full [&>span]:tw-bg-community-bg3 [&>span]:tw-text-community-accent-light [&_svg]:tw-h-5 [&_svg]:tw-w-5 [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [&_h2]:tw-m-0 [&_h2]:tw-text-lg [&_h2]:tw-text-community-bright [&_p]:tw-mx-0 [&_p]:tw-mb-4 [&_p]:tw-mt-1 [&_p]:tw-text-sm [&_p]:tw-text-community-muted [&>button]:tw-min-h-10 [&>button]:tw-whitespace-nowrap [&>button]:tw-rounded-lg [&>button]:tw-border-0 [&>button]:tw-bg-community-accent [&>button]:tw-px-4 [&>button]:tw-font-bold [&>button]:tw-text-community-on-accent [&>button]:tw-cursor-pointer'
            }
          >
            <span>
              <Glyph name="bell" />
            </span>
            <h2>{ja ? '通知はまだありません' : 'No notifications yet'}</h2>
          </div>
        )}
      </div>
    </main>
  );
}
