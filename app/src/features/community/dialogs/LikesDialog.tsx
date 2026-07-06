import type { CommunityModal } from '../state/types';
import { Avatar } from '../components/Avatar';
import { Busy, DialogHeader } from '../components/FormUi';
import { COMMUNITY_DIALOG_SURFACE_CLASS } from './dialogStyles';

export function LikesDialog({
  modal,
  ja,
  close,
  openProfile,
}: {
  modal: Extract<CommunityModal, { kind: 'likes' }>;
  ja: boolean;
  close: () => void;
  openProfile: (loginId: string) => void;
}) {
  return (
    <section
      className={`${COMMUNITY_DIALOG_SURFACE_CLASS} community-connections tw-w-full tw-max-w-[520px]`}
    >
      <DialogHeader title={ja ? 'いいねした人' : 'Liked by'} close={close} />
      {modal.loading ? (
        <div
          className={
            'community-connections-state tw-p-8 tw-text-center tw-text-sm tw-text-community-muted'
          }
        >
          <Busy />
          {ja ? '読み込み中' : 'Loading'}
        </div>
      ) : modal.users.length ? (
        <div
          className={
            'community-connections-list tw-grid tw-gap-2 tw-p-4 [&>button]:tw-grid [&>button]:tw-grid-cols-[auto_minmax(0,1fr)_auto] [&>button]:tw-items-center [&>button]:tw-gap-3 [&>button]:tw-rounded-lg [&>button]:tw-border [&>button]:tw-border-community-border [&>button]:tw-bg-community-bg2 [&>button]:tw-p-3 [&>button]:tw-text-left [&>button]:tw-text-community-text [&>button]:tw-cursor-pointer hover:[&>button]:tw-border-community-accent max-[420px]:[&>button]:tw-grid-cols-[auto_minmax(0,1fr)] [&_span]:tw-grid [&_span]:tw-min-w-0 [&_strong]:tw-text-community-bright [&_small]:tw-text-xs [&_small]:tw-text-community-muted [&_em]:tw-text-xs [&_em]:tw-not-italic [&_em]:tw-text-community-accent-light max-[420px]:[&_em]:tw-hidden'
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
          {ja ? 'いいねはまだありません。' : 'No likes yet.'}
        </div>
      )}
    </section>
  );
}
