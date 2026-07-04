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
  onBookmark,
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
  onBookmark: (post: CommunityPost) => void;
}) {
  return (
    <main
      className={
        'community-scroll tw-min-h-0 tw-min-w-0 tw-overflow-auto [scrollbar-gutter:stable]'
      }
    >
      <div
        className={
          'community-content tw-mx-auto tw-w-full tw-max-w-[1120px] tw-px-6 tw-pb-14 tw-pt-6 max-[960px]:tw-px-4 max-[620px]:tw-px-3 max-[620px]:tw-pb-12'
        }
      >
        <header
          className={
            'community-screen-heading tw-mb-5 tw-flex tw-items-end tw-justify-between tw-gap-6 max-[620px]:tw-items-start max-[620px]:tw-gap-3 max-[420px]:tw-grid [&>div]:tw-min-w-0 [&_h1]:tw-m-0 [&_h1]:tw-text-[clamp(22px,2.5vw,28px)] [&_h1]:tw-font-bold [&_h1]:tw-leading-tight [&_h1]:tw-tracking-[-.02em] [&_h1]:tw-text-community-bright max-[620px]:[&_h1]:tw-text-2xl [&_p]:tw-mb-0 [&_p]:tw-mt-2 [&_p]:tw-max-w-[720px] [&_p]:tw-text-sm [&_p]:tw-text-community-muted [&>button]:tw-inline-flex [&>button]:tw-min-h-10 [&>button]:tw-min-w-[112px] [&>button]:tw-flex-none [&>button]:tw-items-center [&>button]:tw-justify-center [&>button]:tw-gap-2 [&>button]:tw-whitespace-nowrap [&>button]:tw-rounded-lg [&>button]:tw-border-0 [&>button]:tw-bg-community-accent [&>button]:tw-px-4 [&>button]:tw-font-bold [&>button]:tw-text-community-on-accent [&>button]:tw-cursor-pointer hover:[&>button]:tw-translate-y-[-1px] hover:[&>button]:tw-brightness-110 hover:[&>button]:tw-shadow-community-card [&>button_svg]:tw-h-4 [&>button_svg]:tw-w-4 max-[420px]:[&>button]:tw-justify-self-start community-home-heading'
          }
        >
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
          <div
            className={
              'community-error tw-mb-4 tw-flex tw-items-center tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-community-danger tw-bg-community-bg2 tw-px-4 tw-py-3 tw-text-left tw-text-community-danger [&_button]:tw-min-h-10 [&_button]:tw-rounded-lg [&_button]:tw-border-0 [&_button]:tw-bg-community-accent [&_button]:tw-px-4 [&_button]:tw-font-bold [&_button]:tw-text-community-on-accent'
            }
          >
            <span>{error}</span>
            <button onClick={onRetry}>{ja ? '再読み込み' : 'Retry'}</button>
          </div>
        ) : null}
        {loading ? (
          <Empty ja={ja} loading />
        ) : posts.length ? (
          <section
            className={
              'community-feed-panel tw-rounded-2xl tw-border tw-border-community-border tw-bg-community-bg2 tw-p-4 max-[620px]:tw-p-3'
            }
          >
            <header
              className={
                'community-section-heading tw-mb-4 tw-flex tw-items-center tw-justify-between tw-gap-4 max-[420px]:tw-items-end [&_small]:tw-block [&_small]:tw-text-xs [&_small]:tw-font-bold [&_small]:tw-tracking-[.08em] [&_small]:tw-text-community-accent-light [&_h2]:tw-m-0 [&_h2]:tw-text-lg [&_h2]:tw-text-community-bright [&_button]:tw-min-h-10 [&_button]:tw-rounded-lg [&_button]:tw-border [&_button]:tw-border-transparent [&_button]:tw-bg-community-bg3 [&_button]:tw-px-4 [&_button]:tw-font-bold [&_button]:tw-text-community-accent-light [&_button]:tw-cursor-pointer hover:[&_button]:tw-translate-y-[-1px] hover:[&_button]:tw-border-community-accent hover:[&_button]:tw-bg-community-accent-bg'
              }
            >
              <div>
                <small>LATEST</small>
                <h2>{ja ? '新着の活動' : 'Latest activities'}</h2>
              </div>
              <button onClick={onExplore}>{ja ? 'すべて見る' : 'View all'}</button>
            </header>
            <div
              className={
                'community-grid tw-grid tw-grid-cols-2 tw-gap-4 max-[620px]:tw-grid-cols-1 is-home'
              }
            >
              {posts.slice(0, 9).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  ja={ja}
                  onOpen={() => onOpen(post)}
                  onLike={() => onLike(post)}
                  onBookmark={() => onBookmark(post)}
                />
              ))}
            </div>
            {posts.length > 9 ? (
              <button
                className={
                  'community-more tw-mx-auto tw-mt-4 tw-flex tw-min-h-10 tw-items-center tw-rounded-lg tw-border tw-border-transparent tw-bg-community-bg3 tw-px-4 tw-font-bold tw-text-community-accent-light tw-cursor-pointer hover:tw-translate-y-[-1px] hover:tw-border-community-accent hover:tw-bg-community-accent-bg'
                }
                onClick={onExplore}
              >
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
