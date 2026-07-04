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
        <section
          className={
            'community-dialog tw-max-h-[min(90vh,900px)] tw-w-full tw-max-w-[620px] tw-overflow-auto tw-rounded-[18px] tw-border tw-border-[var(--p-border-hover)] tw-bg-community-bg tw-shadow-community-modal tw-animate-community-dialog-in max-[620px]:tw-max-h-[calc(100vh-24px)] max-[620px]:tw-rounded-2xl [&>footer]:tw-flex [&>footer]:tw-justify-end [&>footer]:tw-gap-2 [&>footer]:tw-border-t [&>footer]:tw-border-community-border [&>footer]:tw-bg-community-bg2 [&>footer]:tw-p-4 [&>footer>button]:tw-inline-flex [&>footer>button]:tw-min-h-10 [&>footer>button]:tw-appearance-none [&>footer>button]:tw-items-center [&>footer>button]:tw-justify-center [&>footer>button]:tw-gap-2 [&>footer>button]:tw-rounded-lg [&>footer>button]:tw-border [&>footer>button]:tw-border-community-border [&>footer>button]:tw-bg-community-bg3 [&>footer>button]:tw-px-4 [&>footer>button]:tw-text-sm [&>footer>button]:tw-font-bold [&>footer>button]:tw-text-community-text [&>footer>button]:tw-cursor-pointer [&>footer>button.is-primary]:tw-border-community-accent [&>footer>button.is-primary]:tw-bg-community-accent [&>footer>button.is-primary]:tw-text-community-bg [&_button:disabled]:tw-cursor-not-allowed [&_button:disabled]:tw-opacity-[.55] community-sent tw-w-full tw-max-w-[450px] tw-p-8 tw-text-center [&>span]:tw-mx-auto [&>span]:tw-grid [&>span]:tw-h-[52px] [&>span]:tw-w-[52px] [&>span]:tw-place-items-center [&>span]:tw-rounded-full [&>span]:tw-border [&>span]:tw-border-[var(--p-accent-border)] [&>span]:tw-bg-community-accent-bg [&>span]:tw-text-2xl [&>span]:tw-font-extrabold [&>span]:tw-text-community-accent-light [&_h2]:tw-mb-2 [&_h2]:tw-mt-3 [&_h2]:tw-text-[22px] [&_h2]:tw-text-community-bright [&_p]:tw-m-0 [&_p]:tw-text-community-muted [&>button]:tw-mt-4 [&>button]:tw-min-h-10 [&>button]:tw-rounded-lg [&>button]:tw-border [&>button]:tw-border-[var(--p-accent-border)] [&>button]:tw-bg-community-accent-bg [&>button]:tw-px-4 [&>button]:tw-font-bold [&>button]:tw-text-community-accent-light'
          }
        >
          <span>✓</span>
          <h2>{ja ? '投稿を受け付けました' : 'Post submitted'}</h2>
          <p>{ja ? '運営の確認後に公開されます。' : 'It will be published after review.'}</p>
          <button onClick={close}>{ja ? '閉じる' : 'Close'}</button>
        </section>
      ) : null}
    </div>
  );
}
