import { useEffect, useRef, useState, type FormEvent } from 'react';
import { communityApi } from '../api';
import type { CommunityComment, CommunityPost } from '../types';
import { Avatar } from '../components/Avatar';
import { renderCaptionWithTags } from '../components/CaptionTags';
import { Busy, CharacterCount, ErrorMessage } from '../components/FormUi';
import { Glyph } from '../components/Glyph';
import { cn } from '../classNames';
import { clearRuntimeElementCss, setRuntimeElementCss } from '../../../lib/runtime-element-style';
import { COMMUNITY_INPUT_LIMITS } from '../constants';

export function PostDialog({
  post,
  ja,
  close,
  toggleLike,
  toggleBookmark,
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
  toggleBookmark: (post: CommunityPost) => void;
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
  const imageTrackRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
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
  }, [ja, post.id, token]);

  useEffect(() => {
    const track = imageTrackRef.current;
    if (!track) return;
    setRuntimeElementCss(track, 'carousel-offset', `transform:translateX(-${imageIndex * 100}%)`);
    return () => clearRuntimeElementCss(track, 'carousel-offset');
  }, [imageIndex]);

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
  const submitReport = async (event: FormEvent) => {
    event.preventDefault();
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
          'community-post-viewer-image tw-relative tw-grid tw-min-h-0 tw-place-items-center tw-overflow-hidden tw-bg-[#08090d] max-[760px]:tw-h-[clamp(280px,52vh,480px)] [&>button]:tw-absolute [&>button]:tw-top-1/2 [&>button]:tw-z-[2] [&>button]:tw-grid [&>button]:tw-h-10 [&>button]:tw-w-10 [&>button]:tw-translate-y-[-50%] [&>button]:tw-place-items-center [&>button]:tw-rounded-full [&>button]:tw-border [&>button]:tw-border-white/50 [&>button]:tw-bg-black/70 [&>button]:tw-text-white [&>button]:tw-shadow-lg [&>button]:tw-cursor-pointer hover:[&>button]:tw-scale-110 hover:[&>button]:tw-border-white/80 hover:[&>button]:tw-bg-black/85 [&>button_svg]:tw-h-5 [&>button_svg]:tw-w-5 [&>button_svg]:tw-fill-none [&>button_svg]:tw-stroke-current [&>button_svg]:tw-stroke-[2.5] [&>button_svg]:[stroke-linecap:round] [&>button_svg]:[stroke-linejoin:round] [&>button.is-prev]:tw-left-3 [&>button.is-next]:tw-right-3 [&>span]:tw-absolute [&>span]:tw-bottom-3 [&>span]:tw-left-1/2 [&>span]:tw-z-[2] [&>span]:tw-translate-x-[-50%] [&>span]:tw-rounded-full [&>span]:tw-bg-black/70 [&>span]:tw-px-2 [&>span]:tw-py-1 [&>span]:tw-text-xs [&>span]:tw-text-white'
        }
      >
        <div
          ref={imageTrackRef}
          className={
            'community-post-viewer-track tw-flex tw-h-full tw-transition-transform [&_img]:tw-h-full [&_img]:tw-w-full [&_img]:tw-flex-[0_0_100%] [&_img]:tw-object-contain'
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
          'community-post-viewer-panel tw-min-w-0 tw-overflow-y-auto tw-border-l tw-border-community-border tw-bg-community-bg max-[760px]:tw-border-l-0 max-[760px]:tw-border-t max-[760px]:tw-border-community-border'
        }
      >
        <header
          className={
            'community-post-viewer-head tw-sticky tw-top-0 tw-z-[2] tw-flex tw-min-h-16 tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-community-border tw-bg-community-bg2 tw-px-4 tw-py-3 max-[420px]:tw-px-3'
          }
        >
          <button
            className={
              'community-post-author tw-flex tw-min-w-0 tw-items-center tw-gap-3 tw-border-0 tw-bg-transparent tw-p-0 tw-text-left tw-cursor-pointer disabled:tw-cursor-default [&>div]:tw-grid [&>div]:tw-min-w-0 [&_strong]:tw-overflow-hidden [&_strong]:tw-text-ellipsis [&_strong]:tw-whitespace-nowrap [&_strong]:tw-text-sm [&_strong]:tw-text-community-bright [&_span]:tw-text-xs [&_span]:tw-text-community-muted'
            }
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
          <div
            className={
              'community-post-header-actions tw-flex tw-items-center tw-gap-2 [&>time]:tw-mr-1 [&>time]:tw-whitespace-nowrap [&>time]:tw-text-xs [&>time]:tw-text-community-muted'
            }
          >
            <time>{new Date(post.createdAt).toLocaleDateString(ja ? 'ja-JP' : 'en-US')}</time>
            {token &&
            viewerLoginId?.toLocaleLowerCase() !== post.authorLoginId.toLocaleLowerCase() ? (
              <button
                className={
                  'community-post-delete tw-min-h-9 tw-rounded-lg tw-border tw-border-community-danger tw-bg-transparent tw-px-3 tw-text-[13px] tw-font-bold tw-text-community-danger tw-cursor-pointer hover:tw-bg-community-danger hover:tw-text-white hover:tw-shadow-community-card'
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
                  'community-post-delete tw-min-h-9 tw-rounded-lg tw-border tw-border-community-danger tw-bg-transparent tw-px-3 tw-text-[13px] tw-font-bold tw-text-community-danger tw-cursor-pointer hover:tw-bg-community-danger hover:tw-text-white hover:tw-shadow-community-card'
                }
                type="button"
                onClick={onDelete}
              >
                {ja ? '削除' : 'Delete'}
              </button>
            ) : null}
            <button
              className={
                'community-post-close tw-grid tw-h-10 tw-w-10 tw-place-items-center tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-p-0 tw-text-community-text [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-current'
              }
              onClick={close}
              aria-label={ja ? '閉じる' : 'Close'}
            >
              <Glyph name="close" />
            </button>
          </div>
        </header>
        <section className={'community-post-content tw-px-5 tw-py-5'}>
          <div
            className={
              'community-post-copy tw-grid tw-gap-3 [&_h2]:tw-m-0 [&_h2]:tw-break-words [&_h2]:tw-text-2xl [&_h2]:tw-leading-tight [&_h2]:tw-text-community-bright'
            }
          >
            <h2>{post.title}</h2>
          </div>
          {post.caption.trim() ? (
            <div
              className={
                'community-post-caption tw-whitespace-pre-wrap tw-break-words [&_p]:tw-m-0 [&_p]:tw-leading-7'
              }
            >
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
        {reportOpen ? (
          <form
            className={
              'community-report-form tw-mx-5 tw-mb-4 tw-grid tw-gap-2 tw-rounded-xl tw-border tw-border-community-danger/40 tw-bg-community-bg2 tw-p-3 [&_label]:tw-grid [&_label]:tw-gap-2 [&_span]:tw-text-[13px] [&_span]:tw-font-bold [&_span]:tw-text-community-bright [&_textarea]:tw-min-h-24 [&_textarea]:tw-w-full [&_textarea]:tw-resize-y [&_textarea]:tw-rounded-lg [&_textarea]:tw-border [&_textarea]:tw-border-community-border [&_textarea]:tw-bg-community-bg [&_textarea]:tw-px-3 [&_textarea]:tw-py-2 [&_textarea]:tw-text-sm [&_textarea]:tw-text-community-text [&_textarea]:tw-outline-none focus:[&_textarea]:tw-border-community-accent [&>div]:tw-flex [&>div]:tw-items-center [&>div]:tw-justify-between [&>div]:tw-gap-2 [&_button]:tw-min-h-9 [&_button]:tw-rounded-lg [&_button]:tw-px-3 [&_button]:tw-font-bold [&_button]:tw-cursor-pointer'
            }
            onSubmit={submitReport}
          >
            <label>
              <span className="tw-flex tw-items-center tw-justify-between tw-gap-3">
                <span>{ja ? '通報理由' : 'Report reason'}</span>
                <CharacterCount
                  value={reportReason}
                  max={COMMUNITY_INPUT_LIMITS.reportReason}
                />
              </span>
              <textarea
                value={reportReason}
                onChange={(event) => setReportReason(event.currentTarget.value)}
                maxLength={COMMUNITY_INPUT_LIMITS.reportReason}
                rows={3}
                placeholder={ja ? '問題の内容を入力してください' : 'Describe the issue'}
                required
              />
            </label>
            <div>
              <button
                className={'tw-border tw-border-community-border tw-bg-community-bg3 tw-text-community-text'}
                type="button"
                onClick={() => {
                  setReportOpen(false);
                  setReportReason('');
                }}
              >
                {ja ? 'キャンセル' : 'Cancel'}
              </button>
              <button
                className={'tw-border tw-border-community-danger tw-bg-community-danger tw-text-white'}
                disabled={reportBusy || !reportReason.trim()}
              >
                {reportBusy ? <Busy /> : null}
                {ja ? '送信' : 'Submit'}
              </button>
            </div>
          </form>
        ) : null}
        <div
          className={
            'community-post-actions tw-mx-5 tw-flex tw-items-center tw-justify-between tw-gap-3 tw-border-y tw-border-community-border tw-py-3'
          }
        >
          <div
            className={
              'community-post-primary-actions tw-flex tw-min-w-0 tw-flex-nowrap tw-gap-2'
            }
          >
            <button
              className={cn(
                'community-detail-like tw-flex tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-community-border tw-bg-community-bg3 tw-p-1.5 tw-pr-4 tw-text-community-muted tw-cursor-pointer tw-transition-[background-color,border-color,color,box-shadow,transform] tw-duration-200 tw-ease-out hover:tw-translate-y-[-1px] hover:tw-border-community-danger hover:tw-bg-community-danger/10 hover:tw-text-community-danger hover:tw-shadow-community-card [&.is-active]:tw-border-community-danger [&.is-active]:tw-text-community-danger',
                post.likedByMe && 'is-active',
                likeCelebrating && 'is-celebrating',
              )}
              type="button"
              onClick={() => {
                if (!post.likedByMe) setLikeCelebrating(true);
                toggleLike(post);
              }}
              onAnimationEnd={() => setLikeCelebrating(false)}
              aria-label={ja ? 'いいね' : 'Like'}
            >
              <span
                className={
                  'community-like-icon tw-grid tw-h-9 tw-w-9 tw-place-items-center tw-rounded-full tw-bg-community-bg2 [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [.is-active_&]:tw-bg-[color-mix(in_srgb,var(--p-danger,#e54867)_12%,var(--p-bg2))] [.is-active_&_svg]:tw-fill-current [.is-celebrating_&_svg]:tw-animate-community-action-pop'
                }
              >
                <Glyph name="heart" />
              </span>
              <span
                className={
                  'community-like-copy tw-grid tw-whitespace-nowrap tw-text-left [&_strong]:tw-text-sm [&_small]:tw-text-xs [&_small]:tw-text-community-muted'
                }
              >
                <strong>
                  {post.likedByMe ? (ja ? 'いいね済み' : 'Liked') : ja ? 'いいね' : 'Like'}
                </strong>
                <small>
                  {post.likeCount.toLocaleString()} {ja ? '件' : ''}
                </small>
              </span>
            </button>
            <button
              className={cn(
                'community-detail-bookmark tw-flex tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-community-border tw-bg-community-bg3 tw-p-1.5 tw-pr-4 tw-text-community-muted tw-cursor-pointer tw-transition-[background-color,border-color,color,box-shadow,transform] tw-duration-200 tw-ease-out hover:tw-translate-y-[-1px] hover:tw-border-community-accent hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light hover:tw-shadow-community-card [&.is-active]:tw-border-community-accent [&.is-active]:tw-text-community-accent-light',
                post.bookmarkedByMe && 'is-active',
                bookmarkCelebrating && 'is-celebrating',
              )}
              type="button"
              onClick={() => {
                if (!post.bookmarkedByMe) setBookmarkCelebrating(true);
                toggleBookmark(post);
              }}
              onAnimationEnd={() => setBookmarkCelebrating(false)}
              aria-label={ja ? '保存' : 'Bookmark'}
            >
              <span
                className={
                  'community-bookmark-icon tw-grid tw-h-9 tw-w-9 tw-place-items-center tw-rounded-full tw-bg-community-bg2 [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [.is-active_&_svg]:tw-fill-current [.is-celebrating_&_svg]:tw-animate-community-action-pop'
                }
              >
                <Glyph name="bookmark" />
              </span>
              <span
                className={
                  'community-bookmark-copy tw-grid tw-whitespace-nowrap tw-text-left [&_strong]:tw-text-sm [&_small]:tw-text-xs [&_small]:tw-text-community-muted'
                }
              >
                <strong>
                  {post.bookmarkedByMe ? (ja ? '保存済み' : 'Saved') : ja ? '保存' : 'Save'}
                </strong>
                <small>
                  {post.bookmarkCount.toLocaleString()} {ja ? '件' : ''}
                </small>
              </span>
            </button>
          </div>
          <button
            className={
              'community-post-likes-list tw-flex-none tw-whitespace-nowrap tw-rounded-lg tw-border-0 tw-bg-transparent tw-p-2 tw-text-[13px] tw-text-community-accent-light tw-cursor-pointer hover:tw-bg-community-accent-bg'
            }
            type="button"
            onClick={openLikes}
          >
            <span>{ja ? 'いいねした人' : 'People who liked this'}</span>
            <span aria-hidden>›</span>
          </button>
        </div>
        <div className={'community-comments tw-border-t tw-border-community-border tw-p-5'}>
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
              comments.map((comment) => (
                <article
                  className={cn(
                    'community-comment tw-grid tw-grid-cols-[36px_minmax(0,1fr)] tw-items-start tw-gap-3',
                    `is-${comment.status}`,
                  )}
                  key={comment.id}
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
                        <span>@{comment.authorLoginId}</span>
                      </button>
                      <div
                        className={
                          'community-comment-meta-actions tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2 [&_time]:tw-text-xs [&_time]:tw-text-community-muted [&_button]:tw-border-0 [&_button]:tw-bg-transparent [&_button]:tw-p-0 [&_button]:tw-text-xs [&_button]:tw-text-community-danger [&_em]:tw-rounded-full [&_em]:tw-bg-[#e7a92f]/10 [&_em]:tw-px-2 [&_em]:tw-py-0.5 [&_em]:tw-text-xs [&_em]:tw-not-italic [&_em]:tw-text-[#e7a92f] [&_em.is-rejected]:tw-bg-community-danger/10 [&_em.is-rejected]:tw-text-community-danger'
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
                        <time>
                          {new Date(comment.createdAt).toLocaleDateString(ja ? 'ja-JP' : 'en-US')}
                        </time>
                        {viewerLoginId?.toLocaleLowerCase() ===
                        comment.authorLoginId.toLocaleLowerCase() ? (
                          <button
                            className="tw-rounded-md tw-px-2 tw-py-1 tw-text-community-danger hover:tw-bg-community-danger hover:tw-text-white"
                            type="button"
                            onClick={() => void deleteComment(comment)}
                          >
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
            <form
              className={
                'community-comment-form tw-mt-4 tw-grid tw-gap-2 [&_textarea]:tw-w-full [&_textarea]:tw-resize-y [&_textarea]:tw-rounded-lg [&_textarea]:tw-border [&_textarea]:tw-border-community-border [&_textarea]:tw-bg-community-bg2 [&_textarea]:tw-px-3 [&_textarea]:tw-py-2.5 [&_textarea]:tw-text-community-text [&>div]:tw-flex [&>div]:tw-items-center [&>div]:tw-justify-between [&>div]:tw-gap-3 [&_small]:tw-text-community-muted [&_button]:tw-inline-flex [&_button]:tw-min-h-9 [&_button]:tw-items-center [&_button]:tw-gap-1.5 [&_button]:tw-rounded-lg [&_button]:tw-border-0 [&_button]:tw-bg-community-accent [&_button]:tw-px-3 [&_button]:tw-font-bold [&_button]:tw-text-community-on-accent hover:[&_button:not(:disabled)]:tw-translate-y-[-1px] hover:[&_button:not(:disabled)]:tw-brightness-110 hover:[&_button:not(:disabled)]:tw-shadow-community-card disabled:[&_button]:tw-opacity-55'
              }
              onSubmit={submitComment}
            >
              <div className="tw-flex tw-items-center tw-justify-between tw-gap-3">
                <span className="tw-text-[13px] tw-font-bold tw-text-community-bright">
                  {ja ? 'コメント' : 'Comment'}
                </span>
                <CharacterCount value={commentText} max={COMMUNITY_INPUT_LIMITS.comment} />
              </div>
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength={COMMUNITY_INPUT_LIMITS.comment}
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
      </section>
    </article>
  );
}
