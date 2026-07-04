import type { CommunityPost } from '../types';
import { Empty } from '../components/Empty';
import { Glyph } from '../components/Glyph';
import { PostCard } from '../components/PostCard';

export function HomeScreen({
  posts,
  loading,
  error,
  ja,
  onRetry,
  onCreate,
  onExplore,
  onOpen,
  onLike,
}: {
  posts: CommunityPost[];
  loading: boolean;
  error: string;
  ja: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onExplore: () => void;
  onOpen: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
}) {
  return (
    <main className="community-scroll">
      <div className="community-content">
        <header className="community-screen-heading community-home-heading">
          <div>
            <h1>{ja ? 'みんなの活動' : 'Campus Community'}</h1>
            <p>
              {ja
                ? '作品やイベント、クラブ活動など、キャンパスのみんなが共有した投稿です。'
                : 'Student work, events, clubs and everyday moments from around campus.'}
            </p>
          </div>
          <button onClick={onCreate}>
            <Glyph name="plus" />
            {ja ? '投稿する' : 'Create post'}
          </button>
        </header>
        {error ? (
          <div className="community-error">
            <span>{error}</span>
            <button onClick={onRetry}>{ja ? '再読み込み' : 'Retry'}</button>
          </div>
        ) : null}
        {loading ? (
          <Empty ja={ja} loading />
        ) : posts.length ? (
          <section className="community-feed-panel">
            <header className="community-section-heading">
              <div>
                <small>LATEST</small>
                <h2>{ja ? '新着の活動' : 'Latest activities'}</h2>
              </div>
              <button onClick={onExplore}>{ja ? 'すべて見る' : 'View all'}</button>
            </header>
            <div className="community-grid is-home">
              {posts.slice(0, 9).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  ja={ja}
                  onOpen={() => onOpen(post)}
                  onLike={() => onLike(post)}
                />
              ))}
            </div>
            {posts.length > 9 ? (
              <button className="community-more" onClick={onExplore}>
                {ja ? 'すべての投稿を見る' : 'View all posts'}
              </button>
            ) : null}
          </section>
        ) : (
          <Empty ja={ja} action={onCreate} />
        )}
      </div>
    </main>
  );
}
