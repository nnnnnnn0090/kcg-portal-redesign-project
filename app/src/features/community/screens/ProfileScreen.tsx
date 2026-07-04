import { Avatar } from '../components/Avatar';
import { Empty } from '../components/Empty';
import { PostCard } from '../components/PostCard';
import { SocialIcon } from '../components/SocialIcon';
import type { CommunityPost, CommunityUser } from '../types';
import { socialEntries, websiteLabel } from '../utils';

export function ProfileScreen({
  user,
  viewer,
  posts,
  ja,
  isOwn,
  onEdit,
  onCreate,
  onOpen,
  onLike,
  onFollow,
  onConnections,
  onTagClick,
}: {
  user: CommunityUser;
  viewer: CommunityUser | null;
  posts: CommunityPost[];
  ja: boolean;
  isOwn: boolean;
  onEdit: () => void;
  onCreate: () => void;
  onOpen: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
  onFollow: () => void;
  onConnections: (relation: 'followers' | 'following') => void;
  onTagClick: (tag: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const shown = !isOwn || filter === 'all' ? posts : posts.filter((post) => post.status === filter);
  return (
    <main className="community-scroll">
      <div className="community-content">
        <section className="community-profile">
          <div className="community-profile-banner">
            {user.headerUrl ? (
              <img
                src={user.headerUrl}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
          </div>
          <div className="community-profile-info">
            <Avatar user={user} large />
            <div className="community-profile-copy">
              <div className="community-profile-identity">
                <h1>{user.displayName}</h1>
                <span>@{user.loginId}</span>
              </div>
              <p className="community-profile-bio">
                {user.bio || (ja ? '自己紹介はまだありません。' : 'No bio yet.')}
              </p>
              {user.academicGroup && user.department ? (
                <section className="community-profile-academic">
                  <span>{ja ? '所属' : 'Program'}</span>
                  <div>
                    <strong>{user.academicGroup}</strong>
                    <small>{user.department}</small>
                  </div>
                </section>
              ) : null}
              {(user.profileTags ?? []).length ? (
                <section className="community-profile-tag-section">
                  <span>{ja ? 'プロフィールタグ' : 'Profile tags'}</span>
                  <div
                    className="community-profile-tags"
                    aria-label={ja ? 'プロフィールタグ' : 'Profile tags'}
                  >
                    {(user.profileTags ?? []).map((tag) => (
                      <button type="button" key={tag} onClick={() => onTagClick(tag)}>
                        #{tag}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {user.websiteUrl || socialEntries(user.socialLinks).length ? (
                <section className="community-profile-link-section">
                  <span>{ja ? 'リンク' : 'Links'}</span>
                  <div>
                    {user.websiteUrl ? (
                      <a
                        className="community-profile-link"
                        href={user.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span aria-hidden="true">↗</span>
                        {websiteLabel(user.websiteUrl)}
                      </a>
                    ) : null}
                    {socialEntries(user.socialLinks).length ? (
                      <div
                        className="community-profile-socials"
                        aria-label={ja ? '外部リンク' : 'Social links'}
                      >
                        {socialEntries(user.socialLinks).map((entry) => (
                          <a
                            key={entry.key}
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <SocialIcon platform={entry.key} />
                            <span>{entry.label}</span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
              <div className="community-profile-stats">
                <span>
                  <strong>{posts.length}</strong>
                  {ja ? '投稿' : 'Posts'}
                </span>
                <span>
                  <strong>
                    {isOwn
                      ? posts.filter((post) => post.status === 'approved').length
                      : posts.length}
                  </strong>
                  {ja ? '公開中' : 'Published'}
                </span>
                {isOwn ? (
                  <span>
                    <strong>{posts.filter((post) => post.status === 'pending').length}</strong>
                    {ja ? '審査中' : 'Pending'}
                  </span>
                ) : null}
                <button type="button" onClick={() => onConnections('followers')}>
                  <strong>{user.followerCount ?? 0}</strong>
                  {ja ? 'フォロワー' : 'Followers'}
                </button>
                <button type="button" onClick={() => onConnections('following')}>
                  <strong>{user.followingCount ?? 0}</strong>
                  {ja ? 'フォロー中' : 'Following'}
                </button>
              </div>
            </div>
            <div className="community-profile-actions">
              {isOwn ? (
                <button onClick={onEdit}>{ja ? '編集' : 'Edit'}</button>
              ) : viewer ? (
                <button className={user.followedByMe ? 'is-following' : ''} onClick={onFollow}>
                  {user.followedByMe
                    ? ja
                      ? 'フォロー中'
                      : 'Following'
                    : ja
                      ? 'フォロー'
                      : 'Follow'}
                </button>
              ) : (
                <button onClick={onFollow}>
                  {ja ? 'ログインしてフォロー' : 'Log in to follow'}
                </button>
              )}
            </div>
          </div>
          {isOwn && user.profileState === 'editing' ? (
            <div className="community-notice">
              {ja ? 'プロフィールの変更を審査中です。' : 'Profile changes are under review.'}
            </div>
          ) : null}
        </section>
        {isOwn ? (
          <nav className="community-profile-tabs">
            {(['all', 'approved', 'pending', 'rejected'] as const).map((item) => (
              <button
                className={filter === item ? 'is-active' : ''}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item === 'all'
                  ? ja
                    ? 'すべて'
                    : 'All'
                  : item === 'approved'
                    ? ja
                      ? '公開中'
                      : 'Published'
                    : item === 'pending'
                      ? ja
                        ? '審査中'
                        : 'Pending'
                      : ja
                        ? '非公開'
                        : 'Rejected'}
              </button>
            ))}
          </nav>
        ) : null}
        {shown.length ? (
          <div className="community-grid">
            {shown.map((post) => (
              <div className="community-own-post" key={post.id}>
                <PostCard
                  post={post}
                  ja={ja}
                  onOpen={() => onOpen(post)}
                  onLike={() => onLike(post)}
                />
                <span className={`is-${post.status}`}>
                  {post.status === 'approved'
                    ? ja
                      ? '公開中'
                      : 'Published'
                    : post.status === 'pending'
                      ? ja
                        ? '審査中'
                        : 'Pending'
                      : ja
                        ? '非公開'
                        : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty ja={ja} action={onCreate} />
        )}
      </div>
    </main>
  );
}
