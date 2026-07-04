import type { CommunityNotification } from '../types';
import { Avatar } from '../components/Avatar';
import { Glyph } from '../components/Glyph';

export function NotificationsScreen({
  notifications,
  ja,
  onOpenProfile,
}: {
  notifications: CommunityNotification[];
  ja: boolean;
  onOpenProfile: (loginId: string) => void;
}) {
  const notificationText = (item: CommunityNotification) => {
    if (item.type === 'like')
      return ja
        ? `が「${item.post?.title ?? '投稿'}」にいいねしました`
        : `liked “${item.post?.title ?? 'your post'}”`;
    if (item.type === 'follow') return ja ? 'があなたをフォローしました' : 'followed you';
    if (item.type === 'post_approved')
      return ja ? `「${item.post?.title ?? '投稿'}」が承認されました` : `Your post was approved`;
    if (item.type === 'post_rejected')
      return ja ? `「${item.post?.title ?? '投稿'}」が却下されました` : `Your post was rejected`;
    if (item.type === 'comment_approved')
      return ja ? 'コメントが承認されました' : 'Your comment was approved';
    if (item.type === 'comment_rejected')
      return ja ? 'コメントが却下されました' : 'Your comment was rejected';
    if (item.type === 'profile_approved')
      return ja ? 'プロフィール変更が承認されました' : 'Your profile update was approved';
    return ja ? 'プロフィール変更が却下されました' : 'Your profile update was rejected';
  };
  return (
    <main className="community-scroll">
      <div className="community-content">
        <header className="community-screen-heading">
          <div>
            <h1>{ja ? '通知' : 'Notifications'}</h1>
            <p>
              {ja ? 'いいねやフォローのお知らせを確認できます。' : 'Likes and follows appear here.'}
            </p>
          </div>
        </header>
        {notifications.length ? (
          <section className="community-notifications">
            {notifications.map((item) => (
              <article className={item.read ? '' : 'is-unread'} key={item.id}>
                <button type="button" onClick={() => onOpenProfile(item.actor.loginId)}>
                  <Avatar user={item.actor} />
                  <span>
                    <strong>{item.actor.displayName}</strong>
                    <em>{notificationText(item)}</em>
                    <time>{new Date(item.createdAt).toLocaleString(ja ? 'ja-JP' : 'en-US')}</time>
                  </span>
                </button>
                {item.post?.imageUrl ? <img src={item.post.imageUrl} alt="" /> : null}
              </article>
            ))}
          </section>
        ) : (
          <div className="community-empty">
            <span>
              <Glyph name="bell" />
            </span>
            <h2>{ja ? '通知はまだありません' : 'No notifications yet'}</h2>
          </div>
        )}
      </div>
    </main>
  );
}
