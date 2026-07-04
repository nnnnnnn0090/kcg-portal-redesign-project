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
    <section className="community-dialog community-connections">
      <DialogHeader title={label} close={close} />
      <p className="community-connections-owner">{modal.ownerName}</p>
      {modal.loading ? (
        <div className="community-connections-state">
          <Busy />
          {ja ? '読み込み中' : 'Loading'}
        </div>
      ) : error ? (
        <ErrorMessage text={error} />
      ) : modal.users.length ? (
        <div className="community-connections-list">
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
        <div className="community-connections-state">
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
