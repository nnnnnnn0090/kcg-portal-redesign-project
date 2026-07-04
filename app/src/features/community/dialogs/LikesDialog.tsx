import type { CommunityModal } from '../state/types';
import { Avatar } from '../components/Avatar';
import { Busy, DialogHeader } from '../components/FormUi';

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
    <section className="community-dialog community-connections">
      <DialogHeader title={ja ? 'いいねした人' : 'Liked by'} close={close} />
      {modal.loading ? (
        <div className="community-connections-state">
          <Busy />
          {ja ? '読み込み中' : 'Loading'}
        </div>
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
          {ja ? 'いいねはまだありません。' : 'No likes yet.'}
        </div>
      )}
    </section>
  );
}
