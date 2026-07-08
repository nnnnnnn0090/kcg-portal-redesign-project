import { AuthDialog } from './AuthDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { ConnectionsDialog } from './ConnectionsDialog';
import { CreateDialog } from './CreateDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { LikesDialog } from './LikesDialog';
import { PostDialog } from './PostDialog';
import { ProfileDialog } from './ProfileDialog';
import { SentDialog } from './SentDialog';
import { UnavailableDialog } from './UnavailableDialog';
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
          onDeleteComment={(comment) => props.requestDeleteComment(modal.post, comment)}
          onTagClick={props.openTag}
          onAuthorClick={() => props.openProfile(modal.post.authorLoginId)}
          onCommentAuthorClick={props.openProfile}
          commentsRevision={props.commentsRevision}
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
          detail={modal.post.caption}
          detailLabel={{ ja: '投稿', en: 'Post' }}
        />
      ) : null}
      {modal.kind === 'deleteComment' ? (
        <ConfirmDialog
          ja={ja}
          busy={busy}
          error={error}
          close={() => props.backToPost(modal.post)}
          confirm={() => props.removeComment(modal.post, modal.comment)}
          title={{ ja: 'コメントを削除しますか？', en: 'Delete this comment?' }}
          detail={modal.comment.content}
          detailLabel={{ ja: 'コメント', en: 'Comment' }}
        />
      ) : null}
      {modal.kind === 'deleteAccount' ? (
        <DeleteAccountDialog
          ja={ja}
          busy={busy}
          error={error}
          close={close}
          confirm={(password) => void props.deleteAccount(password)}
        />
      ) : null}
      {modal.kind === 'sent' ? <SentDialog ja={ja} close={close} /> : null}
      {modal.kind === 'unavailable' ? (
        <UnavailableDialog
          ja={ja}
          close={close}
          title={modal.title}
          body={modal.body}
        />
      ) : null}
    </div>
  );
}
