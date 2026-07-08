import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { communityApi } from '../api';
import type { CommunityComment, CommunityPost } from '../types';
import { groupCommentsByParent } from './comment-threads';
import { Avatar } from '../components/Avatar';
import { VerifiedBadge } from '../components/VerifiedBadge';
import { CommunityCaption } from '../components/CommunityCaption';
import { Busy, CharacterCount, ErrorMessage } from '../components/FormUi';
import { Glyph } from '../components/Glyph';
import { cn } from '../../../lib/cn';
import { clearRuntimeElementCss, setRuntimeElementCss } from '../../../lib/runtime-element-style';
import { COMMUNITY_INPUT_LIMITS } from '../constants';
import { formatCommunityCount, formatCommunityDateTime, formatCommunityMetric } from '../utils';

export function PostDialog({
  post,
  ja,
  close,
  toggleLike,
  toggleBookmark,
  openLikes,
  onDelete,
  onDeleteComment,
  onTagClick,
  onAuthorClick,
  onCommentAuthorClick,
  token,
  viewerLoginId,
  commentsRevision = 0,
}: {
  post: CommunityPost;
  ja: boolean;
  close: () => void;
  toggleLike: (post: CommunityPost) => void;
  toggleBookmark: (post: CommunityPost) => void;
  openLikes: () => void;
  onDelete?: () => void;
  onDeleteComment?: (comment: CommunityComment) => void;
  onTagClick: (tag: string) => void;
  onAuthorClick?: () => void;
  onCommentAuthorClick: (loginId: string) => void;
  token: string;
  viewerLoginId?: string;
  commentsRevision?: number;
}) {
  const images =
    post.status !== 'approved' && post.previewUrl
      ? [post.previewUrl]
      : post.imageUrls?.length
        ? post.imageUrls
        : [post.previewUrl || post.imageUrl];
  const [imageIndex, setImageIndex] = useState(0);
  const imageTrackRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommunityComment | null>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [commentError, setCommentError] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [likeCelebrating, setLikeCelebrating] = useState(false);
  const [bookmarkCelebrating, setBookmarkCelebrating] = useState(false);
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
  }, [commentsRevision, ja, post.id, token]);

  const commentGroups = useMemo(() => groupCommentsByParent(comments), [comments]);

  useEffect(() => {
    if (!replyingTo) return;
    commentInputRef.current?.focus();
  }, [replyingTo]);

  const renderComment = (comment: CommunityComment, depth = 0): ReactElement => {
    const replies = commentGroups.get(comment.id) ?? [];
    if (comment.unavailable) {
      return (
        <div className="tw-grid tw-gap-3" key={comment.id}>
          <article
            className={cn(
              'community-comment is-unavailable tw-grid tw-grid-cols-[36px_minmax(0,1fr)] tw-items-start tw-gap-3',
              depth > 0 && 'tw-ml-8',
            )}
          >
            <span
              className="tw-grid tw-h-9 tw-w-9 tw-place-items-center tw-rounded-full tw-border tw-border-community-border tw-bg-community-bg3 tw-text-xs tw-font-bold tw-text-community-muted"
              aria-hidden
            >
              ?
            </span>
            <div className="community-comment-card tw-min-w-0 tw-rounded-xl tw-border tw-border-dashed tw-border-community-border tw-bg-community-bg2 tw-p-3">
              <p className="tw-m-0 tw-text-[13px] tw-text-community-muted">
                {ja ? 'このコメントは存在しません' : 'This comment is no longer available'}
              </p>
            </div>
          </article>
          {replies.map((reply) => renderComment(reply, depth + 1))}
        </div>
      );
    }
    return (
      <div className="tw-grid tw-gap-3" key={comment.id}>
        <article
          className={cn(
            'community-comment tw-grid tw-grid-cols-[36px_minmax(0,1fr)] tw-items-start tw-gap-3',
            `is-${comment.status}`,
            depth > 0 && 'tw-ml-8',
          )}
        >
          <button
            className={
              'community-comment-author tw-rounded-full tw-border-0 tw-bg-transparent tw-p-0 tw-cursor-pointer'
            }
            type="button"
            onClick={() => onCommentAuthorClick(comment.authorLoginId)}
            aria-label={`${comment.authorName}のプロフィールを開く`}
          >
            <Avatar name={comment.authorName} url={comment.authorAvatarUrl} />
          </button>
          <div
            className={
              'community-comment-card tw-min-w-0 tw-rounded-xl tw-bg-community-bg2 tw-p-3 [.is-pending_&]:tw-border [.is-pending_&]:tw-border-[#e7a92f] [.is-rejected_&]:tw-border [.is-rejected_&]:tw-border-community-danger [&>header]:tw-flex [&>header]:tw-items-start [&>header]:tw-justify-between [&>header]:tw-gap-2 [&>p]:tw-mb-0 [&>p]:tw-mt-2 [&>p]:tw-whitespace-pre-wrap [&>p]:tw-break-words [&>small]:tw-mt-2 [&>small]:tw-block [&>small]:tw-text-xs [&>small]:tw-text-community-muted'
            }
          >
            <header>
              <button
                className={
                  'community-comment-author-name tw-border-0 tw-bg-transparent tw-p-0 tw-text-left tw-cursor-pointer [&_strong]:tw-text-[13px] [&_strong]:tw-text-community-bright [&_span]:tw-ml-2 [&_span]:tw-text-xs [&_span]:tw-text-community-muted'
                }
                type="button"
                onClick={() => onCommentAuthorClick(comment.authorLoginId)}
              >
                <strong>{comment.authorName}</strong>
                {comment.authorVerified ? <VerifiedBadge ja={ja} /> : null}
                <span>@{comment.authorLoginId}</span>
              </button>
              <div
                className={
                  'community-comment-meta-actions tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2 [&_time]:tw-text-xs [&_time]:tw-text-community-muted [&_button]:tw-border-0 [&_button]:tw-bg-transparent [&_button]:tw-p-0 [&_button]:tw-text-xs [&_button]:tw-cursor-pointer [&_button.is-reply]:tw-text-community-accent-light hover:[&_button.is-reply]:tw-text-community-bright [&_button.is-danger]:tw-text-community-danger [&_em]:tw-rounded-full [&_em]:tw-bg-[#e7a92f]/10 [&_em]:tw-px-2 [&_em]:tw-py-0.5 [&_em]:tw-text-xs [&_em]:tw-not-italic [&_em]:tw-text-[#e7a92f] [&_em.is-rejected]:tw-bg-community-danger/10 [&_em.is-rejected]:tw-text-community-danger'
                }
              >
                {comment.status !== 'approved' ? (
                  <em className={cn(`is-${comment.status}`)}>
                    {comment.status === 'pending'
                      ? ja
                        ? '審査中'
                        : 'Pending'
                      : ja
                        ? '却下'
                        : 'Rejected'}
                  </em>
                ) : null}
                <time>{formatCommunityDateTime(comment.createdAt, ja)}</time>
                {token ? (
                  <button
                    className="is-reply tw-font-bold"
                    type="button"
                    onClick={() => setReplyingTo(comment)}
                  >
                    {ja ? '返信' : 'Reply'}
                  </button>
                ) : null}
                {viewerLoginId?.toLocaleLowerCase() ===
                comment.authorLoginId.toLocaleLowerCase() ? (
                  <button
                    className="is-danger tw-inline-flex tw-items-center tw-font-bold hover:tw-text-community-bright"
                    type="button"
                    onClick={() => onDeleteComment?.(comment)}
                  >
                    {ja ? '削除' : 'Delete'}
                  </button>
                ) : null}
              </div>
            </header>
            {comment.replyToAuthorLoginId ? (
              <small className="tw-mt-2 tw-block tw-text-xs tw-text-community-muted">
                {ja ? '返信先' : 'Reply to'} @{comment.replyToAuthorLoginId}
              </small>
            ) : null}
            <p>{comment.content}</p>
            {comment.rejectionReason ? (
              <small>
                <b>{ja ? '却下理由' : 'Reason'}</b>
                {comment.rejectionReason}
              </small>
            ) : null}
          </div>
        </article>
        {replies.map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  };

  useEffect(() => {
    const track = imageTrackRef.current;
    if (!track) return;
    setRuntimeElementCss(track, 'carousel-offset', `transform:translateX(-${imageIndex * 100}%)`);
    return () => clearRuntimeElementCss(track, 'carousel-offset');
  }, [imageIndex]);

  const submitComment = async () => {
    const content = commentText.trim();
    if (!content || !token || commentBusy) return;
    const parentId = replyingTo?.id;
    setCommentBusy(true);
    setCommentError('');
    try {
      const result = await communityApi.createComment(token, post.id, content, parentId);
      setComments((current) => [...current, result.comment]);
      setCommentText('');
      setReplyingTo(null);
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
  const submitReport = async () => {
    if (!token || !reportReason.trim() || reportBusy) return;
    setReportBusy(true);
    setCommentError('');
    try {
      await communityApi.report(token, 'post', post.id, reportReason);
      setReportReason('');
      setReportOpen(false);
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
    <article
      className={
        'community-post-dialog tw-grid tw-h-[min(780px,90vh)] tw-w-full tw-max-w-[1080px] tw-grid-cols-[minmax(0,1.35fr)_minmax(360px,.85fr)] tw-overflow-hidden tw-rounded-[18px] tw-border tw-border-[var(--p-border-hover)] tw-bg-community-bg tw-shadow-community-modal tw-animate-community-dialog-in max-[760px]:tw-block max-[760px]:tw-h-auto max-[760px]:tw-max-h-[calc(100vh-24px)] max-[760px]:tw-overflow-auto'
      }
    >
      <div
        className={
          'community-post-viewer-image tw-relative tw-grid tw-min-h-0 tw-place-items-center tw-overflow-hidden tw-bg-[#08090d] max-[760px]:tw-h-[clamp(280px,52vh,480px)] [&>button]:tw-absolute [&>button]:tw-top-1/2 [&>button]:tw-z-[2] [&>button]:tw-grid [&>button]:tw-h-10 [&>button]:tw-w-10 [&>button]:tw-translate-y-[-50%] [&>button]:tw-place-items-center [&>button]:tw-rounded-full [&>button]:tw-border [&>button]:tw-border-white/50 [&>button]:tw-bg-black/70 [&>button]:tw-text-white [&>button]:tw-shadow-lg [&>button]:tw-cursor-pointer [&>button]:tw-transition-[transform,border-color,background-color,box-shadow] [&>button]:tw-duration-180 hover:[&>button]:tw-scale-110 hover:[&>button]:tw-border-white/80 hover:[&>button]:tw-bg-black/85 hover:[&>button]:tw-shadow-[0_8px_24px_rgba(0,0,0,.45)] active:[&>button]:tw-scale-95 [&>button_svg]:tw-h-5 [&>button_svg]:tw-w-5 [&>button_svg]:tw-fill-none [&>button_svg]:tw-stroke-current [&>button_svg]:tw-stroke-[2.5] [&>button_svg]:[stroke-linecap:round] [&>button_svg]:[stroke-linejoin:round] [&>button.is-prev]:tw-left-3 [&>button.is-next]:tw-right-3 [&>span]:tw-absolute [&>span]:tw-bottom-3 [&>span]:tw-left-1/2 [&>span]:tw-z-[2] [&>span]:tw-translate-x-[-50%] [&>span]:tw-rounded-full [&>span]:tw-bg-black/70 [&>span]:tw-px-2 [&>span]:tw-py-1 [&>span]:tw-text-xs [&>span]:tw-text-white'
        }
      >
        <div
          ref={imageTrackRef}
          className={
            'community-post-viewer-track tw-flex tw-h-full tw-transition-transform tw-duration-300 tw-ease-[cubic-bezier(.2,.8,.2,1)] [&_img]:tw-h-full [&_img]:tw-w-full [&_img]:tw-flex-[0_0_100%] [&_img]:tw-object-contain'
          }
        >
          {images.map((image, index) => (
            <img src={image} alt="" key={`${image}-${index}`} />
          ))}
        </div>
        {images.length > 1 ? (
          <>
            <button
              className={'is-prev'}
              type="button"
              onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)}
              aria-label={ja ? '前の写真' : 'Previous photo'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <button
              className={'is-next'}
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

      <section
        className={
          'community-post-viewer-panel tw-flex tw-min-h-0 tw-min-w-0 tw-flex-col tw-overflow-hidden tw-border-l tw-border-community-border tw-bg-community-bg max-[760px]:tw-border-l-0 max-[760px]:tw-border-t max-[760px]:tw-border-community-border'
        }
      >
        <header
          className={
            'community-post-viewer-head tw-shrink-0 tw-border-b tw-border-community-border tw-bg-community-bg2 tw-px-4 tw-py-3 max-[420px]:tw-px-3'
          }
        >
          <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
            <button
              className={
                'community-post-author tw-flex tw-min-w-0 tw-flex-1 tw-items-center tw-gap-3 tw-overflow-hidden tw-rounded-lg tw-border-0 tw-bg-transparent tw-p-1 tw-text-left tw-cursor-pointer tw-transition-[background-color,transform] tw-duration-180 hover:tw-bg-community-accent-bg enabled:hover:tw-translate-x-[1px] disabled:tw-cursor-default'
              }
              type="button"
              onClick={onAuthorClick}
              disabled={!onAuthorClick}
              aria-label={onAuthorClick ? `${post.authorName}のプロフィールを開く` : undefined}
            >
              <Avatar name={post.authorName} url={post.authorAvatarUrl} />
              <div className="tw-min-w-0">
                <span className="tw-flex tw-min-w-0 tw-items-center tw-gap-1">
                  <strong className="tw-overflow-hidden tw-text-ellipsis tw-whitespace-nowrap tw-text-sm tw-font-bold tw-text-community-bright">
                    {post.authorName}
                  </strong>
                  {post.authorVerified ? <VerifiedBadge ja={ja} /> : null}
                </span>
                <span className="tw-mt-0.5 tw-block tw-overflow-hidden tw-text-ellipsis tw-whitespace-nowrap tw-text-xs tw-text-community-muted">
                  @{post.authorLoginId}
                </span>
              </div>
            </button>
            <div className="community-post-header-actions tw-flex tw-shrink-0 tw-items-center tw-gap-2">
              {token &&
              viewerLoginId?.toLocaleLowerCase() !== post.authorLoginId.toLocaleLowerCase() ? (
                <button
                  className={
                    'community-post-delete tw-shrink-0 tw-whitespace-nowrap tw-min-h-9 tw-rounded-lg tw-border tw-border-community-danger tw-bg-transparent tw-px-3 tw-text-[13px] tw-font-bold tw-text-community-danger tw-cursor-pointer tw-transition-[background-color,color,box-shadow,transform] tw-duration-180 hover:tw-translate-y-[-1px] hover:tw-bg-community-danger hover:tw-text-white hover:tw-shadow-community-card active:tw-translate-y-0 active:tw-scale-[.98]'
                  }
                  type="button"
                  disabled={reportBusy}
                  onClick={() => setReportOpen((value) => !value)}
                >
                  {ja ? '通報' : 'Report'}
                </button>
              ) : null}
              {onDelete ? (
                <button
                  className={
                    'community-post-delete tw-shrink-0 tw-whitespace-nowrap tw-min-h-9 tw-rounded-lg tw-border tw-border-community-danger tw-bg-transparent tw-px-3 tw-text-[13px] tw-font-bold tw-text-community-danger tw-cursor-pointer tw-transition-[background-color,color,box-shadow,transform] tw-duration-180 hover:tw-translate-y-[-1px] hover:tw-bg-community-danger hover:tw-text-white hover:tw-shadow-community-card active:tw-translate-y-0 active:tw-scale-[.98]'
                  }
                  type="button"
                  onClick={onDelete}
                >
                  {ja ? '削除' : 'Delete'}
                </button>
              ) : null}
              <button
                className={
                  'community-post-close tw-shrink-0 tw-grid tw-h-10 tw-w-10 tw-place-items-center tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-p-0 tw-text-community-text tw-cursor-pointer tw-transition-[background-color,border-color,color,transform] tw-duration-180 hover:tw-border-community-accent hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light hover:tw-rotate-90 active:tw-scale-95 [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-current'
                }
                onClick={close}
                aria-label={ja ? '閉じる' : 'Close'}
              >
                <Glyph name="close" />
              </button>
            </div>
          </div>
          <time className="tw-mt-2 tw-block tw-text-xs tw-text-community-muted">
            {formatCommunityDateTime(post.createdAt, ja)}
          </time>
        </header>

        <div className="tw-min-h-0 tw-flex-1 tw-overflow-y-auto">
          <section className="community-post-content tw-px-4 tw-py-4 max-[420px]:tw-px-3">
            {post.title.trim() ? (
              <h2 className="tw-m-0 tw-mb-3 tw-break-words tw-text-xl tw-font-bold tw-leading-snug tw-text-community-bright">
                {post.title}
              </h2>
            ) : null}
            {post.caption.trim() ? (
              <CommunityCaption
                caption={post.caption}
                className="tw-text-[15px] tw-leading-7 tw-text-community-text"
                onTagClick={onTagClick}
              />
            ) : null}
          </section>
          {post.rejectionReason ? (
            <aside className="tw-mx-4 tw-mb-4 tw-rounded-xl tw-border tw-border-community-danger/40 tw-bg-community-danger/10 tw-p-3 tw-text-sm tw-text-community-text max-[420px]:tw-mx-3">
              <strong className="tw-block tw-mb-1 tw-text-community-danger">
                {ja ? '非公開の理由' : 'Reason'}
              </strong>
              {post.rejectionReason}
            </aside>
          ) : null}
          {reportOpen ? (
            <div
              className={
                'community-report-form tw-mx-4 tw-mb-4 tw-grid tw-gap-2 tw-rounded-xl tw-border tw-border-community-danger/40 tw-bg-community-bg2 tw-p-3 max-[420px]:tw-mx-3 [&_label]:tw-grid [&_label]:tw-gap-2 [&_span]:tw-text-[13px] [&_span]:tw-font-bold [&_span]:tw-text-community-bright [&_textarea]:tw-min-h-24 [&_textarea]:tw-w-full [&_textarea]:tw-resize-y [&_textarea]:tw-rounded-lg [&_textarea]:tw-border [&_textarea]:tw-border-community-border [&_textarea]:tw-bg-community-bg [&_textarea]:tw-px-3 [&_textarea]:tw-py-2 [&_textarea]:tw-text-sm [&_textarea]:tw-text-community-text [&_textarea]:tw-outline-none focus:[&_textarea]:tw-border-community-accent [&>div]:tw-flex [&>div]:tw-items-center [&>div]:tw-justify-between [&>div]:tw-gap-2 [&_button]:tw-min-h-9 [&_button]:tw-rounded-lg [&_button]:tw-px-3 [&_button]:tw-font-bold [&_button]:tw-cursor-pointer'
              }
              role="form"
              aria-label={ja ? '通報' : 'Report'}
            >
              <label>
                <span className="tw-flex tw-items-center tw-justify-between tw-gap-3">
                  <span>{ja ? '通報理由' : 'Report reason'}</span>
                  <CharacterCount value={reportReason} max={COMMUNITY_INPUT_LIMITS.reportReason} />
                </span>
                <textarea
                  value={reportReason}
                  onChange={(event) => setReportReason(event.currentTarget.value)}
                  maxLength={COMMUNITY_INPUT_LIMITS.reportReason}
                  rows={3}
                  placeholder={ja ? '問題の内容を入力してください' : 'Describe the issue'}
                />
              </label>
              <div>
                <button
                  className={
                    'tw-border tw-border-community-border tw-bg-community-bg3 tw-text-community-text'
                  }
                  type="button"
                  onClick={() => {
                    setReportOpen(false);
                    setReportReason('');
                  }}
                >
                  {ja ? 'キャンセル' : 'Cancel'}
                </button>
                <button
                  className={
                    'tw-border tw-border-community-danger tw-bg-community-danger tw-text-white'
                  }
                  type="button"
                  disabled={reportBusy || !reportReason.trim()}
                  onClick={() => void submitReport()}
                >
                  {reportBusy ? <Busy /> : null}
                  {ja ? '送信' : 'Submit'}
                </button>
              </div>
            </div>
          ) : null}

          <section
            className={
              'community-post-actions tw-border-t tw-border-community-border tw-px-4 tw-py-3 max-[420px]:tw-px-3'
            }
          >
            <div className="community-post-primary-actions tw-grid tw-grid-cols-2 tw-gap-2.5">
              <button
                className={cn(
                  'community-detail-like tw-flex tw-h-11 tw-w-full tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg3 tw-px-3 tw-text-[13px] tw-font-bold tw-text-community-muted tw-cursor-pointer tw-transition-[background-color,border-color,color,transform,box-shadow] tw-duration-180 hover:tw-translate-y-[-1px] hover:tw-border-community-danger/40 hover:tw-bg-community-danger/10 hover:tw-text-community-danger hover:tw-shadow-community-card active:tw-translate-y-0 active:tw-scale-[.98] [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-shrink-0 [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [&.is-active]:tw-border-community-danger/50 [&.is-active]:tw-bg-community-danger/15 [&.is-active]:tw-text-community-danger [&.is-active_svg]:tw-fill-current [&.is-celebrating_svg]:tw-animate-community-action-pop',
                  post.likedByMe && 'is-active',
                  likeCelebrating && 'is-celebrating',
                )}
                type="button"
                onClick={() => {
                  if (!post.likedByMe) setLikeCelebrating(true);
                  toggleLike(post);
                }}
                onAnimationEnd={() => setLikeCelebrating(false)}
                aria-label={
                  post.likedByMe
                    ? ja
                      ? `いいね済み ${formatCommunityCount(post.likeCount, true)}`
                      : `Liked, ${post.likeCount}`
                    : ja
                      ? `いいね ${formatCommunityCount(post.likeCount, true)}`
                      : `Like, ${post.likeCount}`
                }
              >
                <Glyph name="heart" />
                <span className="tw-min-w-0 tw-flex-1 tw-truncate tw-text-left">
                  {post.likedByMe ? (ja ? 'いいね済み' : 'Liked') : ja ? 'いいね' : 'Like'}
                </span>
                <span
                  className={cn(
                    'tw-shrink-0 tw-rounded-md tw-bg-black/15 tw-px-2 tw-py-0.5 tw-text-xs tw-font-semibold tw-tabular-nums tw-text-community-muted',
                    post.likedByMe && 'tw-bg-community-danger/20 tw-text-community-danger',
                  )}
                >
                  {formatCommunityCount(post.likeCount, ja)}
                </span>
              </button>
              <button
                className={cn(
                  'community-detail-bookmark tw-flex tw-h-11 tw-w-full tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg3 tw-px-3 tw-text-[13px] tw-font-bold tw-text-community-muted tw-cursor-pointer tw-transition-[background-color,border-color,color,transform,box-shadow] tw-duration-180 hover:tw-translate-y-[-1px] hover:tw-border-community-accent/40 hover:tw-bg-community-accent/10 hover:tw-text-community-accent-light hover:tw-shadow-community-card active:tw-translate-y-0 active:tw-scale-[.98] [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-shrink-0 [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [&.is-active]:tw-border-community-accent/50 [&.is-active]:tw-bg-community-accent/15 [&.is-active]:tw-text-community-accent-light [&.is-active_svg]:tw-fill-current [&.is-celebrating_svg]:tw-animate-community-action-pop',
                  post.bookmarkedByMe && 'is-active',
                  bookmarkCelebrating && 'is-celebrating',
                )}
                type="button"
                onClick={() => {
                  if (!post.bookmarkedByMe) setBookmarkCelebrating(true);
                  toggleBookmark(post);
                }}
                onAnimationEnd={() => setBookmarkCelebrating(false)}
                aria-label={
                  post.bookmarkedByMe
                    ? ja
                      ? `保存済み ${formatCommunityCount(post.bookmarkCount, true)}`
                      : `Saved, ${post.bookmarkCount}`
                    : ja
                      ? `保存 ${formatCommunityCount(post.bookmarkCount, true)}`
                      : `Save, ${post.bookmarkCount}`
                }
              >
                <Glyph name="bookmark" />
                <span className="tw-min-w-0 tw-flex-1 tw-truncate tw-text-left">
                  {post.bookmarkedByMe ? (ja ? '保存済み' : 'Saved') : ja ? '保存' : 'Save'}
                </span>
                <span
                  className={cn(
                    'tw-shrink-0 tw-rounded-md tw-bg-black/15 tw-px-2 tw-py-0.5 tw-text-xs tw-font-semibold tw-tabular-nums tw-text-community-muted',
                    post.bookmarkedByMe && 'tw-bg-community-accent/20 tw-text-community-accent-light',
                  )}
                >
                  {formatCommunityCount(post.bookmarkCount, ja)}
                </span>
              </button>
            </div>
            <div className="tw-mt-2.5 tw-flex tw-items-center tw-justify-between tw-gap-3">
              <span
                className={
                  'community-detail-impressions tw-inline-flex tw-items-center tw-gap-1.5 tw-text-xs tw-text-community-muted [&_svg]:tw-h-4 [&_svg]:tw-w-4'
                }
                aria-label={
                  ja
                    ? formatCommunityMetric(post.impressionCount, true, {
                        ja: '表示',
                        enSingular: 'view',
                        enPlural: 'views',
                      })
                    : formatCommunityMetric(post.impressionCount, false, {
                        ja: '表示',
                        enSingular: 'view',
                        enPlural: 'views',
                      })
                }
              >
                <Glyph name="impression" />
                <span>
                  {formatCommunityMetric(post.impressionCount, ja, {
                    ja: '表示',
                    enSingular: 'view',
                    enPlural: 'views',
                  })}
                </span>
              </span>
              <button
                className={
                  'community-post-likes-list tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap tw-rounded-lg tw-border-0 tw-bg-transparent tw-px-2 tw-py-1 tw-text-[13px] tw-font-bold tw-text-community-accent-light tw-cursor-pointer tw-transition-[background-color,transform,color] tw-duration-150 hover:tw-bg-community-accent-bg hover:tw-text-community-bright active:tw-scale-95'
                }
                type="button"
                onClick={openLikes}
              >
                <span>{ja ? 'いいねした人' : 'People who liked this'}</span>
                <span aria-hidden>›</span>
              </button>
            </div>
          </section>

          <div className={'community-comments tw-border-t tw-border-community-border tw-p-4 max-[420px]:tw-p-3'}>
          <div
            className={
              'community-comments-heading tw-mb-4 tw-flex tw-items-center tw-justify-between [&_strong]:tw-text-community-bright [&_span]:tw-rounded-full [&_span]:tw-bg-community-bg3 [&_span]:tw-px-2 [&_span]:tw-text-xs [&_span]:tw-text-community-muted'
            }
          >
            <strong>{ja ? 'コメント' : 'Comments'}</strong>
            <span>{comments.length}</span>
          </div>
          <div
            className={
              'community-comment-list tw-grid tw-gap-3 [&>p]:tw-m-0 [&>p]:tw-text-[13px] [&>p]:tw-text-community-muted'
            }
          >
            {commentsLoading ? (
              <p>{ja ? '読み込み中…' : 'Loading…'}</p>
            ) : comments.length ? (
              (commentGroups.get(null) ?? []).map((comment) => renderComment(comment))
            ) : (
              <p>{ja ? 'まだコメントはありません。' : 'No comments yet.'}</p>
            )}
          </div>
          {token ? (
            <div
              className={
                'community-comment-form tw-mt-4 tw-grid tw-gap-2 [&_textarea]:tw-w-full [&_textarea]:tw-resize-y [&_textarea]:tw-rounded-lg [&_textarea]:tw-border [&_textarea]:tw-border-community-border [&_textarea]:tw-bg-community-bg2 [&_textarea]:tw-px-3 [&_textarea]:tw-py-2.5 [&_textarea]:tw-text-community-text [&>div]:tw-flex [&>div]:tw-items-center [&>div]:tw-justify-between [&>div]:tw-gap-3 [&_small]:tw-text-community-muted [&_button]:tw-inline-flex [&_button]:tw-min-h-9 [&_button]:tw-items-center [&_button]:tw-gap-1.5 [&_button]:tw-rounded-lg [&_button]:tw-border-0 [&_button]:tw-bg-community-accent [&_button]:tw-px-3 [&_button]:tw-font-bold [&_button]:tw-text-community-on-accent hover:[&_button:not(:disabled)]:tw-translate-y-[-1px] hover:[&_button:not(:disabled)]:tw-brightness-110 hover:[&_button:not(:disabled)]:tw-shadow-community-card disabled:[&_button]:tw-opacity-55'
              }
              role="form"
              aria-label={ja ? 'コメント' : 'Comment'}
            >
              {replyingTo ? (
                <div className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-rounded-lg tw-bg-community-bg2 tw-px-3 tw-py-2 tw-text-[13px] tw-text-community-muted">
                  <span>
                    {ja ? '返信先' : 'Replying to'} @{replyingTo.authorLoginId}
                  </span>
                  <button
                    className="tw-border-0 tw-bg-transparent tw-p-0 tw-text-xs tw-font-bold tw-text-community-accent-light tw-cursor-pointer hover:tw-text-community-bright"
                    type="button"
                    onClick={() => setReplyingTo(null)}
                  >
                    {ja ? 'キャンセル' : 'Cancel'}
                  </button>
                </div>
              ) : null}
              <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
                <span className="tw-text-[13px] tw-font-bold tw-text-community-bright">
                  {replyingTo ? (ja ? '返信' : 'Reply') : ja ? 'コメント' : 'Comment'}
                </span>
                <CharacterCount value={commentText} max={COMMUNITY_INPUT_LIMITS.comment} />
              </div>
              <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength={COMMUNITY_INPUT_LIMITS.comment}
                rows={3}
                placeholder={
                  replyingTo
                    ? ja
                      ? `@${replyingTo.authorLoginId} への返信`
                      : `Reply to @${replyingTo.authorLoginId}`
                    : ja
                      ? 'コメントを書く'
                      : 'Write a comment'
                }
              />
              <div>
                <small>
                  {ja
                    ? 'すべてのコメントは審査後に公開されます。'
                    : 'All comments are published after review.'}
                </small>
                <button
                  type="button"
                  disabled={commentBusy || !commentText.trim()}
                  onClick={() => void submitComment()}
                >
                  {commentBusy ? <Busy /> : null}
                  {ja ? '審査へ送信' : 'Submit'}
                </button>
              </div>
            </div>
          ) : (
            <p
              className={
                'community-comment-login-note tw-mt-6 tw-rounded-lg tw-bg-community-bg2 tw-p-4 tw-text-[13px] tw-text-community-muted'
              }
            >
              {ja ? 'コメントするにはログインしてください。' : 'Log in to comment.'}
            </p>
          )}
          <ErrorMessage text={commentError} />
        </div>
        </div>
      </section>
    </article>
  );
}
