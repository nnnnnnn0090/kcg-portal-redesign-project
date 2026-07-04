import type { CommunityModal } from '../state/types';
import { Avatar } from '../components/Avatar';
import { Busy, DialogHeader, ErrorMessage } from '../components/FormUi';

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
      className={
        'community-dialog tw-max-h-[min(90vh,900px)] tw-w-full tw-max-w-[620px] tw-overflow-auto tw-rounded-[18px] tw-border tw-border-[var(--p-border-hover)] tw-bg-community-bg tw-shadow-community-modal tw-animate-community-dialog-in max-[620px]:tw-max-h-[calc(100vh-24px)] max-[620px]:tw-rounded-2xl [&>footer]:tw-flex [&>footer]:tw-justify-end [&>footer]:tw-gap-2 [&>footer]:tw-border-t [&>footer]:tw-border-community-border [&>footer]:tw-bg-community-bg2 [&>footer]:tw-p-4 [&>footer>button]:tw-inline-flex [&>footer>button]:tw-min-h-10 [&>footer>button]:tw-appearance-none [&>footer>button]:tw-items-center [&>footer>button]:tw-justify-center [&>footer>button]:tw-gap-2 [&>footer>button]:tw-rounded-lg [&>footer>button]:tw-border [&>footer>button]:tw-border-community-border [&>footer>button]:tw-bg-community-bg3 [&>footer>button]:tw-px-4 [&>footer>button]:tw-text-sm [&>footer>button]:tw-font-bold [&>footer>button]:tw-text-community-text [&>footer>button]:tw-cursor-pointer [&>footer>button.is-primary]:tw-border-community-accent [&>footer>button.is-primary]:tw-bg-community-accent [&>footer>button.is-primary]:tw-text-community-on-accent [&_button:disabled]:tw-cursor-not-allowed [&_button:disabled]:tw-opacity-[.55] community-connections tw-w-full tw-max-w-[520px]'
      }
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
            'community-connections-list tw-grid tw-gap-2 tw-p-4 [&>button]:tw-grid [&>button]:tw-grid-cols-[auto_minmax(0,1fr)_auto] [&>button]:tw-items-center [&>button]:tw-gap-3 [&>button]:tw-rounded-lg [&>button]:tw-border [&>button]:tw-border-community-border [&>button]:tw-bg-community-bg2 [&>button]:tw-p-3 [&>button]:tw-text-left [&>button]:tw-cursor-pointer hover:[&>button]:tw-border-community-accent max-[420px]:[&>button]:tw-grid-cols-[auto_minmax(0,1fr)] [&_span]:tw-grid [&_span]:tw-min-w-0 [&_small]:tw-text-xs [&_small]:tw-text-community-muted [&_em]:tw-text-xs [&_em]:tw-not-italic [&_em]:tw-text-community-accent-light max-[420px]:[&_em]:tw-hidden'
          }
        >
          {modal.users.map((item) => (
            <button type="button" key={item.id} onClick={() => openProfile(item.loginId)}>
              <Avatar user={item} />
              <span>
                <strong>{item.displayName}</strong>
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
