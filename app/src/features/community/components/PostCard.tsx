import type { MouseEvent } from 'react';
import type { CommunityPost } from '../types';
import { Avatar } from './Avatar';
import { Glyph } from './Glyph';

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
      className="community-post"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen();
      }}
    >
      <div className="community-post-media">
        <img src={post.previewUrl || post.imageUrl} alt="" loading="lazy" />
        {(post.imageUrls?.length ?? 1) > 1 ? (
          <span className="community-post-image-count">▣ {post.imageUrls?.length}</span>
        ) : null}
      </div>
      <div className="community-post-card-body">
        <div className="community-post-card-title">
          <h2>{post.title}</h2>
          {postedLabel ? <time>{postedLabel}</time> : null}
        </div>
        <p>{post.caption}</p>
        <footer>
          <div className="community-post-card-author">
            <Avatar name={post.authorName} url={post.authorAvatarUrl} />
            <strong>{post.authorName}</strong>
          </div>
          {visibleTags.length ? (
            <div className="community-post-tags">
              {visibleTags.map((item) => (
                <span key={item}>#{item}</span>
              ))}
            </div>
          ) : null}
          <button
            className={`community-like${post.likedByMe ? ' is-active' : ''}`}
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
