import { AuthDialog } from './AuthDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { ConnectionsDialog } from './ConnectionsDialog';
import { CreateDialog } from './CreateDialog';
import { LikesDialog } from './LikesDialog';
import { PostDialog } from './PostDialog';
import { ProfileDialog } from './ProfileDialog';
import { SentDialog } from './SentDialog';
import type { ModalLayerProps } from './types';

export function ModalLayer(props: ModalLayerProps) {
  const { modal, user, ja, busy, error, close } = props;
  if (modal.kind === 'none') return null;
  return (
    <div
      className={
        'community-modal-layer tw-absolute tw-inset-0 tw-z-20 tw-grid tw-place-items-center tw-overflow-auto tw-bg-[color-mix(in_srgb,#000_62%,transparent)] tw-p-6 max-[620px]:tw-p-3'
      }
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {modal.kind === 'auth' ? <AuthDialog {...props} mode={modal.mode} /> : null}
      {modal.kind === 'create' && user ? <CreateDialog {...props} user={user} /> : null}
      {modal.kind === 'post' ? (
        <PostDialog
          post={modal.post}
          ja={ja}
          close={close}
          toggleLike={props.toggleLike}
          toggleBookmark={props.toggleBookmark}
          openLikes={() => props.openLikes(modal.post)}
          token={props.token}
          viewerLoginId={user?.loginId}
          onDelete={
            props.canDeletePost(modal.post) ? () => props.requestDelete(modal.post) : undefined
          }
          onTagClick={props.openTag}
          onAuthorClick={() => props.openProfile(modal.post.authorLoginId)}
          onCommentAuthorClick={props.openProfile}
        />
      ) : null}
      {modal.kind === 'profile' && user ? <ProfileDialog {...props} user={user} /> : null}
      {modal.kind === 'connections' ? (
        <ConnectionsDialog
          modal={modal}
          ja={ja}
          error={error}
          close={close}
          openProfile={props.openProfile}
        />
      ) : null}
      {modal.kind === 'likes' ? (
        <LikesDialog modal={modal} ja={ja} close={close} openProfile={props.openProfile} />
      ) : null}
      {modal.kind === 'delete' ? (
        <ConfirmDialog
          ja={ja}
          busy={busy}
          error={error}
          close={close}
          confirm={() => props.removePost(modal.post)}
        />
      ) : null}
      {modal.kind === 'sent' ? <SentDialog ja={ja} close={close} /> : null}
    </div>
  );
}
