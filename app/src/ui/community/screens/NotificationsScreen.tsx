import { useState } from 'react';
import type { CommunityNotification } from '../types';
import { Avatar } from '../components/Avatar';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { Glyph } from '../components/Glyph';
import { communityNotificationCopy } from '../notificationCopy';
import { resolveCommunityNotificationTarget } from '../notificationTarget';
import { cn } from '../../../lib/cn';
import { formatCommunityDateTime } from '../utils';

function NotificationPostThumb({
  imageUrl,
  ja,
}: {
  imageUrl: string;
  ja: boolean;
}) {
  const [broken, setBroken] = useState(!imageUrl);
  if (broken) {
    return (
      <span
        className="tw-grid tw-h-14 tw-w-[76px] tw-flex-none tw-place-items-center tw-rounded-lg tw-border tw-border-dashed tw-border-community-border tw-bg-community-bg3 tw-text-[11px] tw-font-bold tw-text-community-muted"
        aria-hidden="true"
      >
        {ja ? '削除済' : 'Gone'}
      </span>
    );
  }
  return (
    <img
      src={imageUrl}
      alt=""
      className="tw-h-14 tw-w-[76px] tw-flex-none tw-rounded-lg tw-object-cover tw-transition-transform tw-duration-200 group-hover/notif:tw-scale-105"
      onError={() => setBroken(true)}
    />
  );
}

export function NotificationsScreen({
  notifications,
  ja,
  onOpen,
}: {
  notifications: CommunityNotification[];
  ja: boolean;
  onOpen: (item: CommunityNotification) => void;
}) {
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
            'community-screen-heading tw-mb-5 tw-flex tw-items-end tw-justify-between tw-gap-6 max-[620px]:tw-items-start max-[620px]:tw-gap-3 max-[420px]:tw-grid [&>div]:tw-min-w-0 [&_h1]:tw-m-0 [&_h1]:tw-text-[clamp(22px,2.5vw,28px)] [&_h1]:tw-font-bold [&_h1]:tw-leading-tight [&_h1]:tw-tracking-[-.02em] [&_h1]:tw-text-community-bright max-[620px]:[&_h1]:tw-text-2xl [&_p]:tw-mb-0 [&_p]:tw-mt-2 [&_p]:tw-max-w-[720px] [&_p]:tw-text-sm [&_p]:tw-text-community-muted'
          }
        >
          <div>
            <h1>{ja ? '通知' : 'Notifications'}</h1>
            <p>
              {ja
                ? 'いいね・フォロー・審査結果のお知らせです。項目を押すと該当の場所を開きます。'
                : 'Likes, follows, and review updates. Tap an item to open it.'}
            </p>
          </div>
        </header>
        {notifications.length ? (
          <section className="community-notifications tw-grid tw-gap-2">
            {notifications.map((item, index) => {
              const copy = communityNotificationCopy(item, ja);
              const target = resolveCommunityNotificationTarget(item);
              const canOpen = target.kind !== 'none';
              const showActor = item.type === 'like' || item.type === 'follow';
              return (
                <button
                  type="button"
                  key={item.id}
                  disabled={!canOpen}
                  onClick={() => {
                    if (canOpen) onOpen(item);
                  }}
                  aria-label={
                    canOpen
                      ? ja
                        ? `${copy.title}の通知を開く`
                        : `Open notification from ${copy.title}`
                      : undefined
                  }
                  style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
                  className={cn(
                    'community-notification tw-group/notif tw-flex tw-w-full tw-items-center tw-gap-4 tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg2 tw-p-4 tw-text-left tw-animate-community-item-in tw-transition-[transform,border-color,background-color,box-shadow] tw-duration-200 tw-ease-out enabled:tw-cursor-pointer enabled:hover:tw-translate-x-[2px] enabled:hover:tw-border-[var(--p-border-hover)] enabled:hover:tw-bg-community-bg3 enabled:hover:tw-shadow-community-card disabled:tw-cursor-default',
                    !item.read &&
                      'is-unread tw-border-community-accent tw-bg-community-accent-bg tw-shadow-[inset_3px_0_0_var(--p-accent)]',
                  )}
                >
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
                      <span className="tw-flex tw-min-w-0 tw-items-center tw-gap-1">
                        <strong className="tw-overflow-hidden tw-text-ellipsis tw-whitespace-nowrap tw-text-sm tw-text-community-bright">
                          {copy.title}
                        </strong>
                        {showActor && item.actor.verified ? <VerifiedBadge ja={ja} /> : null}
                      </span>
                      <time dateTime={item.createdAt}>
                        {formatCommunityDateTime(item.createdAt, ja, 'compact')}
                      </time>
                    </span>
                    <em>{copy.body}</em>
                  </span>
                  {item.post?.id ? (
                    <NotificationPostThumb imageUrl={item.post.imageUrl} ja={ja} />
                  ) : null}
                </button>
              );
            })}
          </section>
        ) : (
          <div
            className={
              'community-empty tw-rounded-2xl tw-border tw-border-dashed tw-border-community-border tw-bg-community-bg2 tw-px-6 tw-py-10 tw-text-center [&>span]:tw-mx-auto [&>span]:tw-mb-3 [&>span]:tw-grid [&>span]:tw-h-11 [&>span]:tw-w-11 [&>span]:tw-place-items-center [&>span]:tw-rounded-full [&>span]:tw-bg-community-bg3 [&>span]:tw-text-community-accent-light [&_svg]:tw-h-5 [&_svg]:tw-w-5 [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [&_h2]:tw-m-0 [&_h2]:tw-text-lg [&_h2]:tw-text-community-bright [&_p]:tw-mx-0 [&_p]:tw-mb-4 [&_p]:tw-mt-1 [&_p]:tw-text-sm [&_p]:tw-text-community-muted'
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
