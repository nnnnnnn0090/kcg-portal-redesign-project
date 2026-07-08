import type { CommunityModal } from '../state/types';
import { Avatar } from '../components/Avatar';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { Busy, DialogHeader, ErrorMessage } from '../components/FormUi';
import { COMMUNITY_DIALOG_SURFACE_CLASS } from './dialogStyles';

export function ConnectionsDialog({
  modal,
  ja,
  error,
  close,
  openProfile,
}: {
  modal: Extract<CommunityModal, { kind: 'connections' }>;
  ja: boolean;
  error: string;
  close: () => void;
  openProfile: (loginId: string) => void;
}) {
  const label =
    modal.relation === 'followers'
      ? ja
        ? 'フォロワー'
        : 'Followers'
      : ja
        ? 'フォロー中'
        : 'Following';
  return (
    <section
      className={`${COMMUNITY_DIALOG_SURFACE_CLASS} community-connections tw-w-full tw-max-w-[520px]`}
    >
      <DialogHeader title={label} close={close} />
      <p
        className={
          'community-connections-owner tw-m-0 tw-border-b tw-border-community-border tw-px-4 tw-py-3 tw-text-[13px] tw-text-community-muted'
        }
      >
        {modal.ownerName}
      </p>
      {modal.loading ? (
        <div
          className={
            'community-connections-state tw-p-8 tw-text-center tw-text-sm tw-text-community-muted'
          }
        >
          <Busy />
          {ja ? '読み込み中' : 'Loading'}
        </div>
      ) : error ? (
        <ErrorMessage text={error} />
      ) : modal.users.length ? (
        <div
          className={
            'community-connections-list tw-grid tw-gap-2 tw-p-4 [&>button]:tw-grid [&>button]:tw-grid-cols-[auto_minmax(0,1fr)_auto] [&>button]:tw-items-center [&>button]:tw-gap-3 [&>button]:tw-rounded-lg [&>button]:tw-border [&>button]:tw-border-community-border [&>button]:tw-bg-community-bg2 [&>button]:tw-p-3 [&>button]:tw-text-left [&>button]:tw-text-community-text [&>button]:tw-cursor-pointer [&>button]:tw-transition-[transform,border-color,background-color,box-shadow] [&>button]:tw-duration-180 hover:[&>button]:tw-translate-y-[-2px] hover:[&>button]:tw-border-community-accent hover:[&>button]:tw-bg-community-accent-bg hover:[&>button]:tw-shadow-community-card active:[&>button]:tw-translate-y-0 active:[&>button]:tw-scale-[.98] max-[420px]:[&>button]:tw-grid-cols-[auto_minmax(0,1fr)] [&_span]:tw-grid [&_span]:tw-min-w-0 [&_strong]:tw-text-community-bright [&_small]:tw-text-xs [&_small]:tw-text-community-muted [&_em]:tw-text-xs [&_em]:tw-not-italic [&_em]:tw-text-community-accent-light max-[420px]:[&_em]:tw-hidden'
          }
        >
          {modal.users.map((item) => (
            <button type="button" key={item.id} onClick={() => openProfile(item.loginId)}>
              <Avatar user={item} />
              <span>
                <strong className="tw-flex tw-min-w-0 tw-items-center tw-gap-1">
                  {item.displayName}
                  {item.verified ? <VerifiedBadge ja={ja} /> : null}
                </strong>
                <small>@{item.loginId}</small>
              </span>
              <em>{ja ? 'プロフィールを見る' : 'View profile'}</em>
            </button>
          ))}
        </div>
      ) : (
        <div
          className={
            'community-connections-state tw-p-8 tw-text-center tw-text-sm tw-text-community-muted'
          }
        >
          {modal.relation === 'followers'
            ? ja
              ? 'フォロワーはまだいません。'
              : 'No followers yet.'
            : ja
              ? 'まだ誰もフォローしていません。'
              : 'Not following anyone yet.'}
        </div>
      )}
    </section>
  );
}
