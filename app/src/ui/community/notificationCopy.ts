import type { CommunityNotification } from './types';

export function communityNotificationCopy(
  item: CommunityNotification,
  ja: boolean,
): { title: string; body: string } {
  const actor = item.actor.displayName;
  const postGone = Boolean(item.post?.id) && !item.post?.title && !item.post?.imageUrl;
  const postTitle = postGone
    ? ja
      ? '削除された投稿'
      : 'Deleted post'
    : item.post?.title || (ja ? '投稿' : 'your post');

  if (item.type === 'like') {
    return {
      title: actor,
      body: ja ? `が「${postTitle}」にいいねしました` : `liked “${postTitle}”`,
    };
  }
  if (item.type === 'follow') {
    return { title: actor, body: ja ? 'あなたをフォローしました' : 'followed you' };
  }
  if (item.type === 'post_approved') {
    return {
      title: ja ? '投稿が承認されました' : 'Post approved',
      body: postTitle,
    };
  }
  if (item.type === 'post_rejected') {
    return {
      title: ja ? '投稿が却下されました' : 'Post rejected',
      body: postTitle,
    };
  }
  if (item.type === 'comment_approved') {
    return {
      title: ja ? 'コメントが承認されました' : 'Comment approved',
      body: postGone ? postTitle : actor,
    };
  }
  if (item.type === 'comment_rejected') {
    return {
      title: ja ? 'コメントが却下されました' : 'Comment rejected',
      body: postGone ? postTitle : actor,
    };
  }
  if (item.type === 'profile_approved') {
    return {
      title: ja ? 'プロフィールが承認されました' : 'Profile approved',
      body: actor,
    };
  }
  return {
    title: ja ? 'プロフィールが却下されました' : 'Profile rejected',
    body: actor,
  };
}
