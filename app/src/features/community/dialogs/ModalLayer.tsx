import { AuthDialog } from './AuthDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { ConnectionsDialog } from './ConnectionsDialog';
import { CreateDialog } from './CreateDialog';
import { LikesDialog } from './LikesDialog';
import { PostDialog } from './PostDialog';
import { ProfileDialog } from './ProfileDialog';
import type { ModalLayerProps } from './types';

export function ModalLayer(props: ModalLayerProps) {
  const { modal, user, ja, busy, error, close } = props;
  if (modal.kind === 'none') return null;
  return (
    <div
      className="community-modal-layer"
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
          openLikes={() => props.openLikes(modal.post)}
          token={props.token}
          viewerLoginId={user?.loginId}
          onDelete={
            props.canDeletePost(modal.post) ? () => props.requestDelete(modal.post) : undefined
          }
          onTagClick={props.openTag}
          onAuthorClick={
            modal.post.authorLoginId
              ? () => props.openProfile(modal.post.authorLoginId as string)
              : undefined
          }
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
      {modal.kind === 'sent' ? (
        <section className="community-dialog community-sent">
          <span>✓</span>
          <h2>{ja ? '投稿を受け付けました' : 'Post submitted'}</h2>
          <p>{ja ? '運営の確認後に公開されます。' : 'It will be published after review.'}</p>
          <button onClick={close}>{ja ? '閉じる' : 'Close'}</button>
        </section>
      ) : null}
    </div>
  );
}
