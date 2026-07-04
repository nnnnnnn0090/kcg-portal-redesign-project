import type { MouseEvent } from 'react';
import type { CommunityPost } from '../types';
import { Avatar } from './Avatar';
import { Glyph } from './Glyph';
import { cn } from '../classNames';

export function PostCard({
  post,
  ja,
  onOpen,
  onLike,
}: {
  post: CommunityPost;
  ja: boolean;
  onOpen: () => void;
  onLike: () => void;
}) {
  const like = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onLike();
  };
  const visibleTags = post.tags.slice(0, 3);
  const postedAt = new Date(post.createdAt);
  const postedLabel = Number.isNaN(postedAt.getTime())
    ? ''
    : postedAt.toLocaleDateString(ja ? 'ja-JP' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
  return (
    <article
      className={
        'community-post tw-min-w-0 tw-overflow-hidden tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg2 tw-shadow-community-card tw-cursor-pointer tw-transition hover:tw-translate-y-[-2px] hover:tw-border-community-accent hover:tw-shadow-lg focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-community-accent'
      }
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen();
      }}
    >
      <div
        className={
          'community-post-media tw-relative tw-aspect-video tw-overflow-hidden tw-bg-community-bg3 [&>img]:tw-block [&>img]:tw-h-full [&>img]:tw-w-full [&>img]:tw-object-cover'
        }
      >
        <img src={post.previewUrl || post.imageUrl} alt="" loading="lazy" />
        {(post.imageUrls?.length ?? 1) > 1 ? (
          <span
            className={
              'community-post-image-count tw-absolute tw-right-2 tw-top-2 tw-rounded-full tw-bg-black/70 tw-px-2 tw-py-[3px] tw-text-xs tw-text-white'
            }
          >
            ▣ {post.imageUrls?.length}
          </span>
        ) : null}
      </div>
      <div
        className={
          'community-post-card-body tw-px-3 tw-py-2 [&>p]:tw-mb-0 [&>p]:tw-mt-0.5 [&>p]:tw-overflow-hidden [&>p]:tw-text-ellipsis [&>p]:tw-whitespace-nowrap [&>p]:tw-text-[13px] [&>p]:tw-text-community-muted [&>footer]:tw-mt-2 [&>footer]:tw-flex [&>footer]:tw-items-center [&>footer]:tw-justify-between [&>footer]:tw-gap-2'
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
        <p>{post.caption}</p>
        <footer>
          <div
            className={
              'community-post-card-author tw-flex tw-min-w-0 tw-items-center tw-gap-2 [&_.community-avatar]:tw-h-[26px] [&_.community-avatar]:tw-w-[26px] [&_.community-avatar]:tw-flex-[0_0_26px] [&>strong]:tw-min-w-0 [&>strong]:tw-overflow-hidden [&>strong]:tw-text-ellipsis [&>strong]:tw-whitespace-nowrap [&>strong]:tw-text-[13px] [&>strong]:tw-font-semibold'
            }
          >
            <Avatar name={post.authorName} url={post.authorAvatarUrl} />
            <strong>{post.authorName}</strong>
          </div>
          {visibleTags.length ? (
            <div
              className={
                'community-post-tags tw-flex tw-min-w-0 tw-flex-1 tw-justify-end tw-gap-2 tw-overflow-hidden [&>span]:tw-whitespace-nowrap [&>span]:tw-text-xs [&>span]:tw-text-community-accent-light'
              }
            >
              {visibleTags.map((item) => (
                <span key={item}>#{item}</span>
              ))}
            </div>
          ) : null}
          <button
            className={cn(
              'community-like tw-inline-flex tw-h-8 tw-min-w-11 tw-items-center tw-justify-center tw-gap-1 tw-rounded-full tw-border-0 tw-bg-community-bg3 tw-text-xs tw-text-community-muted tw-cursor-pointer [&_svg]:tw-h-4 [&_svg]:tw-w-4 [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [&.is-active]:tw-text-community-danger [&.is-active_svg]:tw-fill-current',
              post.likedByMe && 'is-active',
            )}
            type="button"
            onClick={like}
            aria-label="いいね"
          >
            <Glyph name="heart" />
            <span>{post.likeCount}</span>
          </button>
        </footer>
      </div>
    </article>
  );
}
