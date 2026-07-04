import { ALL_TAG } from '../constants';
import type { CommunityPost, CommunityUser } from '../types';
import { Avatar } from '../components/Avatar';
import { Empty } from '../components/Empty';
import { Glyph } from '../components/Glyph';
import { PostCard } from '../components/PostCard';

export function ExploreScreen({
  posts,
  users,
  loading,
  query,
  tag,
  tags,
  ja,
  title,
  description,
  setQuery,
  setTag,
  onOpenProfile,
  onOpen,
  onLike,
}: {
  posts: CommunityPost[];
  users: CommunityUser[];
  loading: boolean;
  query: string;
  tag: string;
  tags: string[];
  ja: boolean;
  title?: string;
  description?: string;
  setQuery: (value: string) => void;
  setTag: (value: string) => void;
  onOpenProfile: (loginId: string) => void;
  onOpen: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
}) {
  return (
    <main className="community-scroll">
      <div className="community-content">
        <header className="community-screen-heading">
          <div>
            <h1>{title || (ja ? '見つける' : 'Explore')}</h1>
            <p>
              {description ||
                (ja
                  ? 'キーワードや本文のハッシュタグから活動を探せます。'
                  : 'Find activities by keyword or hashtag.')}
            </p>
          </div>
        </header>
        <label className="community-search">
          <Glyph name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ja ? '投稿・アカウントを検索' : 'Search posts and accounts'}
          />
        </label>
        <div className="community-chips">
          {tags.map((item) => (
            <button
              className={tag === item ? 'is-active' : ''}
              key={item}
              onClick={() => setTag(item)}
            >
              {item === ALL_TAG ? (ja ? 'すべて' : 'All') : `#${item}`}
            </button>
          ))}
        </div>
        <div className="community-result">
          <strong>{ja ? '投稿' : 'Posts'}</strong>
          <span>{loading ? '—' : `${posts.length}${ja ? '件' : ''}`}</span>
        </div>
        {users.length ? (
          <section className="community-account-results">
            <header>
              <strong>{ja ? 'アカウント' : 'Accounts'}</strong>
              <span>
                {users.length}
                {ja ? '件' : ''}
              </span>
            </header>
            <div>
              {users.map((item) => (
                <button type="button" key={item.id} onClick={() => onOpenProfile(item.loginId)}>
                  <Avatar user={item} />
                  <span>
                    <strong>{item.displayName}</strong>
                    <small>@{item.loginId}</small>
                    {(item.profileTags ?? []).length ? (
                      <em>{item.profileTags.map((profileTag) => `#${profileTag}`).join(' ')}</em>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {loading ? (
          <Empty ja={ja} loading />
        ) : posts.length ? (
          <div className="community-grid">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                ja={ja}
                onOpen={() => onOpen(post)}
                onLike={() => onLike(post)}
              />
            ))}
          </div>
        ) : (
          <Empty ja={ja} />
        )}
      </div>
    </main>
  );
}
