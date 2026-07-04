import type { CommunityUser } from '../types';
import { cn } from '../classNames';

export function Avatar({
  user,
  name,
  url,
  large,
}: {
  user?: CommunityUser;
  name?: string;
  url?: string | null;
  large?: boolean;
}) {
  const label = user?.displayName || name || '?';
  const source = user?.avatarUrl || url;
  return (
    <span
      className={cn(
        'community-avatar tw-relative tw-grid tw-h-9 tw-w-9 tw-flex-[0_0_36px] tw-place-items-center tw-overflow-hidden tw-rounded-full tw-border tw-border-[var(--p-avatar-ring,#fff)] tw-bg-black tw-text-[13px] tw-font-bold tw-text-community-accent-light [&>span]:tw-relative [&>span]:tw-z-[1] [&>span]:tw-leading-none [&>img]:tw-absolute [&>img]:tw-inset-0 [&>img]:tw-z-[2] [&>img]:tw-block [&>img]:tw-h-full [&>img]:tw-w-full [&>img]:tw-object-cover [&.is-large]:tw-h-[84px] [&.is-large]:tw-w-[84px] [&.is-large]:tw-flex-[0_0_84px] [&.is-large]:tw-text-[28px] max-[620px]:[&.is-large]:tw-h-[76px] max-[620px]:[&.is-large]:tw-w-[76px] max-[620px]:[&.is-large]:tw-flex-[0_0_76px]',
        large && 'is-large',
      )}
    >
      <span>{label.slice(0, 1).toUpperCase()}</span>
      {source ? (
        <img
          src={source}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
    </span>
  );
}
