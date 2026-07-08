import { communityNotificationCopy } from '../notificationCopy';
import type { CommunityNotification } from '../types';
import { Avatar } from './Avatar';
import { cn } from '../../../lib/cn';

export function CommunityNotificationToast({
  notification,
  closing,
  ja,
  onOpen,
  onDismiss,
  onAnimationEnd,
}: {
  notification: CommunityNotification | null;
  closing: boolean;
  ja: boolean;
  onOpen: () => void;
  onDismiss: () => void;
  onAnimationEnd: (event: React.AnimationEvent<HTMLDivElement>) => void;
}) {
  if (!notification) return null;
  const copy = communityNotificationCopy(notification, ja);
  return (
    <div
      className={
        'community-notification-toast-host tw-pointer-events-none tw-absolute tw-right-4 tw-top-[68px] tw-z-[45] tw-w-[min(320px,calc(100%-2rem))] max-[620px]:tw-right-3 max-[620px]:tw-top-[60px]'
      }
    >
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'community-notification-toast tw-pointer-events-auto tw-grid tw-grid-cols-[auto_minmax(0,1fr)_auto] tw-items-start tw-gap-3 tw-rounded-xl tw-border tw-border-community-border tw-bg-[color-mix(in_srgb,var(--p-bg2)_94%,transparent)] tw-p-3 tw-shadow-[0_12px_36px_color-mix(in_srgb,#000_28%,transparent)] tw-backdrop-blur-sm tw-transition-[border-color,box-shadow,transform] tw-duration-200 hover:tw-border-community-accent hover:tw-shadow-[0_16px_40px_color-mix(in_srgb,#000_34%,transparent)]',
          closing
            ? 'tw-animate-community-toast-out-right'
            : 'tw-animate-community-toast-from-right',
        )}
        onAnimationEnd={onAnimationEnd}
      >
        <button
          type="button"
          className="tw-col-span-2 tw-grid tw-min-w-0 tw-grid-cols-[auto_minmax(0,1fr)] tw-items-start tw-gap-3 tw-border-0 tw-bg-transparent tw-p-0 tw-text-left tw-cursor-pointer"
          onClick={onOpen}
        >
          <Avatar user={notification.actor} />
          <span className="tw-grid tw-min-w-0 tw-gap-1">
            <strong className="tw-overflow-hidden tw-text-ellipsis tw-whitespace-nowrap tw-text-sm tw-text-community-bright">
              {copy.title}
            </strong>
            <span className="tw-overflow-hidden tw-text-ellipsis tw-whitespace-nowrap tw-text-xs tw-text-community-muted">
              {copy.body}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="tw-inline-flex tw-h-7 tw-w-7 tw-flex-none tw-items-center tw-justify-center tw-rounded-full tw-border-0 tw-bg-community-bg3 tw-text-xs tw-font-bold tw-text-community-muted tw-cursor-pointer tw-transition-[background-color,color,transform] tw-duration-150 hover:tw-bg-community-accent-bg hover:tw-text-community-text hover:tw-rotate-90 active:tw-scale-90"
          aria-label={ja ? '閉じる' : 'Dismiss'}
          onClick={onDismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
