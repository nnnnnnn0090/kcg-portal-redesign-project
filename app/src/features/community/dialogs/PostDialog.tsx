import { useEffect, useState, type FormEvent } from 'react';
import { communityApi } from '../api';
import type { CommunityComment, CommunityPost } from '../types';
import { Avatar } from '../components/Avatar';
import { renderCaptionWithTags } from '../components/CaptionTags';
import { Busy, ErrorMessage } from '../components/FormUi';
import { Glyph } from '../components/Glyph';

export function PostDialog({
  post,
  ja,
  close,
  toggleLike,
  openLikes,
  onDelete,
  onTagClick,
  onAuthorClick,
  onCommentAuthorClick,
  token,
  viewerLoginId,
}: {
  post: CommunityPost;
  ja: boolean;
  close: () => void;
  toggleLike: (post: CommunityPost) => void;
  openLikes: () => void;
  onDelete?: () => void;
  onTagClick: (tag: string) => void;
  onAuthorClick?: () => void;
  onCommentAuthorClick: (loginId: string) => void;
  token: string;
  viewerLoginId?: string;
}) {
  const images = post.imageUrls?.length ? post.imageUrls : [post.previewUrl || post.imageUrl];
  const [imageIndex, setImageIndex] = useState(0);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setCommentsLoading(true);
    communityApi
      .postComments(post.id, token || undefined)
      .then((result) => {
        if (active) setComments(result.comments);
      })
      .catch(() => {
        if (active)
          setCommentError(ja ? 'コメントを読み込めませんでした。' : 'Could not load comments.');
      })
      .finally(() => {
        if (active) setCommentsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ja, post.id, token]);

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    const content = commentText.trim();
    if (!content || !token || commentBusy) return;
    setCommentBusy(true);
    setCommentError('');
    try {
      const result = await communityApi.createComment(token, post.id, content);
      setComments((current) => [...current, result.comment]);
      setCommentText('');
    } catch (submitError) {
      setCommentError(
        submitError instanceof Error
          ? submitError.message
          : ja
            ? '送信できませんでした。'
            : 'Could not submit.',
      );
    } finally {
      setCommentBusy(false);
    }
  };
  const deleteComment = async (comment: CommunityComment) => {
    if (!token || !window.confirm(ja ? 'このコメントを削除しますか？' : 'Delete this comment?'))
      return;
    setCommentError('');
    try {
      await communityApi.deleteComment(token, post.id, comment.id);
      setComments((current) => current.filter((item) => item.id !== comment.id));
    } catch (deleteError) {
      setCommentError(
        deleteError instanceof Error
          ? deleteError.message
          : ja
            ? '削除できませんでした。'
            : 'Could not delete comment.',
      );
    }
  };
  const reportPost = async () => {
    if (!token) return;
    const reason = window.prompt(ja ? '通報理由を入力してください' : 'Report reason');
    if (!reason?.trim() || reportBusy) return;
    setReportBusy(true);
    setCommentError('');
    try {
      await communityApi.report(token, 'post', post.id, reason);
      window.alert(ja ? '通報を送信しました。' : 'Report submitted.');
    } catch (reportError) {
      setCommentError(
        reportError instanceof Error
          ? reportError.message
          : ja
            ? '通報できませんでした。'
            : 'Could not report.',
      );
    } finally {
      setReportBusy(false);
    }
  };
  return (
    <article className="community-post-dialog">
      <div className="community-post-viewer-image">
        <div
          className="community-post-viewer-track"
          style={{ transform: `translateX(-${imageIndex * 100}%)` }}
        >
          {images.map((image, index) => (
            <img src={image} alt="" key={`${image}-${index}`} />
          ))}
        </div>
        {images.length > 1 ? (
          <>
            <button
              className="is-prev"
              type="button"
              onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)}
              aria-label={ja ? '前の写真' : 'Previous photo'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <button
              className="is-next"
              type="button"
              onClick={() => setImageIndex((imageIndex + 1) % images.length)}
              aria-label={ja ? '次の写真' : 'Next photo'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
            <span>
              {imageIndex + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>

      <section className="community-post-viewer-panel">
        <header className="community-post-viewer-head">
          <button
            className="community-post-author"
            type="button"
            onClick={onAuthorClick}
            disabled={!onAuthorClick}
            aria-label={onAuthorClick ? `${post.authorName}のプロフィールを開く` : undefined}
          >
            <Avatar name={post.authorName} url={post.authorAvatarUrl} />
            <div>
              <strong>{post.authorName}</strong>
              <span>@{post.authorLoginId}</span>
            </div>
          </button>
          <div className="community-post-header-actions">
            <time>{new Date(post.createdAt).toLocaleDateString(ja ? 'ja-JP' : 'en-US')}</time>
            {token &&
            viewerLoginId?.toLocaleLowerCase() !== post.authorLoginId.toLocaleLowerCase() ? (
              <button
                className="community-post-delete"
                type="button"
                disabled={reportBusy}
                onClick={() => void reportPost()}
              >
                {ja ? '通報' : 'Report'}
              </button>
            ) : null}
            {onDelete ? (
              <button className="community-post-delete" type="button" onClick={onDelete}>
                {ja ? '削除' : 'Delete'}
              </button>
            ) : null}
            <button
              className="community-post-close"
              onClick={close}
              aria-label={ja ? '閉じる' : 'Close'}
            >
              <Glyph name="close" />
            </button>
          </div>
        </header>
        <section className="community-post-content">
          <div className="community-post-copy">
            <h2>{post.title}</h2>
          </div>
          {post.caption.trim() ? (
            <div className="community-post-caption">
              <p>{renderCaptionWithTags(post.caption, onTagClick)}</p>
            </div>
          ) : null}
        </section>
        {post.rejectionReason ? (
          <aside>
            <strong>{ja ? '非公開の理由' : 'Reason'}</strong>
            {post.rejectionReason}
          </aside>
        ) : null}
        <div className="community-post-actions">
          <button
            className={`community-detail-like${post.likedByMe ? ' is-active' : ''}`}
            type="button"
            onClick={() => toggleLike(post)}
            aria-label={ja ? 'いいね' : 'Like'}
          >
            <span className="community-like-icon">
              <Glyph name="heart" />
            </span>
            <span className="community-like-copy">
              <strong>
                {post.likedByMe ? (ja ? 'いいね済み' : 'Liked') : ja ? 'いいね' : 'Like'}
              </strong>
              <small>
                {post.likeCount.toLocaleString()} {ja ? '件' : ''}
              </small>
            </span>
          </button>
          <button className="community-post-likes-list" type="button" onClick={openLikes}>
            <span>{ja ? 'いいねした人' : 'People who liked this'}</span>
            <span aria-hidden>›</span>
          </button>
        </div>
        <div className="community-comments">
          <div className="community-comments-heading">
            <strong>{ja ? 'コメント' : 'Comments'}</strong>
            <span>{comments.length}</span>
          </div>
          <div className="community-comment-list">
            {commentsLoading ? (
              <p>{ja ? '読み込み中…' : 'Loading…'}</p>
            ) : comments.length ? (
              comments.map((comment) => (
                <article className={`community-comment is-${comment.status}`} key={comment.id}>
                  <button
                    className="community-comment-author"
                    type="button"
                    onClick={() => onCommentAuthorClick(comment.authorLoginId)}
                    aria-label={`${comment.authorName}のプロフィールを開く`}
                  >
                    <Avatar name={comment.authorName} url={comment.authorAvatarUrl} />
                  </button>
                  <div className="community-comment-card">
                    <header>
                      <button
                        className="community-comment-author-name"
                        type="button"
                        onClick={() => onCommentAuthorClick(comment.authorLoginId)}
                      >
                        <strong>{comment.authorName}</strong>
                        <span>@{comment.authorLoginId}</span>
                      </button>
                      <div className="community-comment-meta-actions">
                        {comment.status !== 'approved' ? (
                          <em className={`is-${comment.status}`}>
                            {comment.status === 'pending'
                              ? ja
                                ? '審査中'
                                : 'Pending'
                              : ja
                                ? '却下'
                                : 'Rejected'}
                          </em>
                        ) : null}
                        <time>
                          {new Date(comment.createdAt).toLocaleDateString(ja ? 'ja-JP' : 'en-US')}
                        </time>
                        {viewerLoginId?.toLocaleLowerCase() ===
                        comment.authorLoginId.toLocaleLowerCase() ? (
                          <button type="button" onClick={() => void deleteComment(comment)}>
                            {ja ? '削除' : 'Delete'}
                          </button>
                        ) : null}
                      </div>
                    </header>
                    <p>{comment.content}</p>
                    {comment.rejectionReason ? (
                      <small>
                        <b>{ja ? '却下理由' : 'Reason'}</b>
                        {comment.rejectionReason}
                      </small>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <p>{ja ? 'まだコメントはありません。' : 'No comments yet.'}</p>
            )}
          </div>
          {token ? (
            <form className="community-comment-form" onSubmit={submitComment}>
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder={ja ? 'コメントを書く' : 'Write a comment'}
              />
              <div>
                <small>
                  {ja
                    ? 'すべてのコメントは審査後に公開されます。'
                    : 'All comments are published after review.'}
                </small>
                <button disabled={commentBusy || !commentText.trim()}>
                  {commentBusy ? <Busy /> : null}
                  {ja ? '審査へ送信' : 'Submit'}
                </button>
              </div>
            </form>
          ) : (
            <p className="community-comment-login-note">
              {ja ? 'コメントするにはログインしてください。' : 'Log in to comment.'}
            </p>
          )}
          <ErrorMessage text={commentError} />
        </div>
      </section>
    </article>
  );
}
