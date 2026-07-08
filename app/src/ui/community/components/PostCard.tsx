import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { CommunityPost } from '../types';
import { CommunityCaption } from './CommunityCaption';
import { Avatar } from './Avatar';
import { Glyph } from './Glyph';
import { VerifiedBadge } from './VerifiedBadge';
import { cn } from '../../../lib/cn';
import { formatCommunityDateTime } from '../utils';

export function PostCard({
  post,
  ja,
  onOpen,
  onLike,
  onBookmark,
  onImpression,
  index = 0,
}: {
  post: CommunityPost;
  ja: boolean;
  onOpen: () => void;
  onLike: () => void;
  onBookmark: () => void;
  onImpression: () => void;
  index?: number;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [likeCelebrating, setLikeCelebrating] = useState(false);
  const [bookmarkCelebrating, setBookmarkCelebrating] = useState(false);
  const like = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!post.likedByMe) setLikeCelebrating(true);
    onLike();
  };
  const bookmark = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!post.bookmarkedByMe) setBookmarkCelebrating(true);
    onBookmark();
  };
  const visibleTags = post.tags.slice(0, 3);
  const postedLabel = formatCommunityDateTime(post.createdAt, ja, 'compact');
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      onImpression();
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onImpression();
          observer.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [onImpression]);
  return (
    <article
      ref={cardRef}
      className={
        'community-post tw-group tw-min-w-0 tw-overflow-hidden tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg2 tw-shadow-community-card tw-cursor-pointer tw-animate-community-item-in tw-transition-[transform,border-color,box-shadow] tw-duration-200 tw-ease-out hover:tw-translate-y-[-3px] hover:tw-border-community-accent hover:tw-shadow-[0_14px_36px_color-mix(in_srgb,#000_20%,transparent)] focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-community-accent active:tw-translate-y-[-1px]'
      }
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen();
      }}
    >
      <div
        className={
          'community-post-media tw-relative tw-aspect-video tw-overflow-hidden tw-bg-community-bg3 [&>img]:tw-block [&>img]:tw-h-full [&>img]:tw-w-full [&>img]:tw-object-cover [&>img]:tw-transition-transform [&>img]:tw-duration-500 [&>img]:tw-ease-out group-hover:[&>img]:tw-scale-[1.035]'
        }
      >
        <img src={post.previewUrl || post.imageUrl} alt="" loading="lazy" />
        {(post.imageUrls?.length ?? 1) > 1 ? (
          <span
            className={
              'community-post-image-count tw-absolute tw-right-2 tw-top-2 tw-rounded-full tw-bg-black/70 tw-px-2 tw-py-[3px] tw-text-xs tw-text-white tw-backdrop-blur-[2px] tw-transition-transform tw-duration-200 group-hover:tw-scale-105'
            }
          >
            ▣ {post.imageUrls?.length}
          </span>
        ) : null}
      </div>
      <div
        className={
          'community-post-card-body tw-px-3 tw-py-2 [&>footer]:tw-mt-2 [&>footer]:tw-flex [&>footer]:tw-items-center [&>footer]:tw-justify-between [&>footer]:tw-gap-2'
        }
      >
        <div
          className={
            'community-post-card-title tw-flex tw-items-center tw-justify-between tw-gap-2 [&>h2]:tw-m-0 [&>h2]:tw-min-w-0 [&>h2]:tw-flex-1 [&>h2]:tw-overflow-hidden [&>h2]:tw-text-ellipsis [&>h2]:tw-whitespace-nowrap [&>h2]:tw-text-sm [&>h2]:tw-text-community-bright [&>time]:tw-flex-none [&>time]:tw-whitespace-nowrap [&>time]:tw-text-xs [&>time]:tw-text-community-muted'
          }
        >
          <h2>{post.title}</h2>
          {postedLabel ? <time>{postedLabel}</time> : null}
        </div>
        <CommunityCaption
          caption={post.caption}
          preview
          className="tw-line-clamp-1 tw-text-[13px] tw-leading-relaxed tw-text-community-muted"
        />
        <footer>
          <div
            className={
              'community-post-card-author tw-flex tw-min-w-0 tw-items-center tw-gap-2 [&_.community-avatar]:tw-h-[26px] [&_.community-avatar]:tw-w-[26px] [&_.community-avatar]:tw-flex-[0_0_26px] [&>strong]:tw-min-w-0 [&>strong]:tw-overflow-hidden [&>strong]:tw-text-ellipsis [&>strong]:tw-whitespace-nowrap [&>strong]:tw-text-[13px] [&>strong]:tw-font-semibold'
            }
          >
            <Avatar name={post.authorName} url={post.authorAvatarUrl} />
            <strong>{post.authorName}</strong>
            {post.authorVerified ? <VerifiedBadge ja={ja} /> : null}
          </div>
          {visibleTags.length ? (
            <div
              className={
                'community-post-tags tw-flex tw-min-w-0 tw-flex-1 tw-justify-end tw-gap-2 tw-overflow-hidden [&>span]:tw-whitespace-nowrap [&>span]:tw-text-xs [&>span]:tw-text-community-accent-light'
              }
            >
              {visibleTags.map((item) => (
                <span
                  key={item}
                  className="tw-transition-colors tw-duration-150 group-hover:tw-text-community-accent"
                >
                  #{item}
                </span>
              ))}
            </div>
          ) : null}
          <span
            className={'community-post-card-actions tw-flex tw-flex-none tw-items-center tw-gap-1'}
          >
            <span
              className={
                'community-impression-count tw-inline-flex tw-h-8 tw-min-w-11 tw-items-center tw-justify-center tw-gap-1 tw-rounded-full tw-bg-community-bg3 tw-px-2 tw-text-xs tw-text-community-muted [&_svg]:tw-h-4 [&_svg]:tw-w-4'
              }
              aria-label={ja ? `表示 ${post.impressionCount}件` : `${post.impressionCount} views`}
            >
              <Glyph name="impression" />
              <span>{post.impressionCount}</span>
            </span>
            <span
              className={
                'community-comment-count tw-inline-flex tw-h-8 tw-min-w-11 tw-items-center tw-justify-center tw-gap-1 tw-rounded-full tw-bg-community-bg3 tw-px-2 tw-text-xs tw-text-community-muted [&_svg]:tw-h-4 [&_svg]:tw-w-4'
              }
              aria-label={ja ? `コメント ${post.commentCount}件` : `${post.commentCount} comments`}
            >
              <Glyph name="comment" />
              <span>{post.commentCount}</span>
            </span>
            <button
              className={cn(
                'community-bookmark tw-inline-flex tw-h-8 tw-min-w-11 tw-items-center tw-justify-center tw-gap-1 tw-rounded-full tw-border-0 tw-bg-community-bg3 tw-text-xs tw-text-community-muted tw-cursor-pointer tw-transition-[background-color,color,box-shadow,transform] tw-duration-200 tw-ease-out hover:tw-translate-y-[-1px] hover:tw-bg-community-accent-bg hover:tw-text-community-accent-light hover:tw-shadow-community-card active:tw-translate-y-0 active:tw-scale-95 [&_svg]:tw-h-4 [&_svg]:tw-w-4 [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [&.is-active]:tw-text-community-accent-light [&.is-active_svg]:tw-fill-current [&.is-celebrating_svg]:tw-animate-community-action-pop',
                post.bookmarkedByMe && 'is-active',
                bookmarkCelebrating && 'is-celebrating',
              )}
              type="button"
              onClick={bookmark}
              onAnimationEnd={() => setBookmarkCelebrating(false)}
              aria-label={ja ? '保存' : 'Bookmark'}
            >
              <Glyph name="bookmark" />
              <span>{post.bookmarkCount}</span>
            </button>
            <button
              className={cn(
                'community-like tw-inline-flex tw-h-8 tw-min-w-11 tw-items-center tw-justify-center tw-gap-1 tw-rounded-full tw-border-0 tw-bg-community-bg3 tw-text-xs tw-text-community-muted tw-cursor-pointer tw-transition-[background-color,color,box-shadow,transform] tw-duration-200 tw-ease-out hover:tw-translate-y-[-1px] hover:tw-bg-community-danger/10 hover:tw-text-community-danger hover:tw-shadow-community-card active:tw-translate-y-0 active:tw-scale-95 [&_svg]:tw-h-4 [&_svg]:tw-w-4 [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [&.is-active]:tw-text-community-danger [&.is-active_svg]:tw-fill-current [&.is-celebrating_svg]:tw-animate-community-action-pop',
                post.likedByMe && 'is-active',
                likeCelebrating && 'is-celebrating',
              )}
              type="button"
              onClick={like}
              onAnimationEnd={() => setLikeCelebrating(false)}
              aria-label={ja ? 'いいね' : 'Like'}
            >
              <Glyph name="heart" />
              <span>{post.likeCount}</span>
            </button>
          </span>
        </footer>
      </div>
    </article>
  );
}
