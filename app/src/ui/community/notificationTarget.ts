import type { CommunityNotification } from './types';

export type CommunityNotificationTarget =
  | { kind: 'post'; postId: string }
  | { kind: 'profile'; loginId: string }
  | { kind: 'ownProfile' }
  | { kind: 'none' };

/** 通知タップ時の遷移先を種別と付随データから決める */
export function resolveCommunityNotificationTarget(
  item: CommunityNotification,
): CommunityNotificationTarget {
  switch (item.type) {
    case 'like':
    case 'post_approved':
    case 'post_rejected':
    case 'comment_approved':
    case 'comment_rejected':
      return item.post?.id
        ? { kind: 'post', postId: item.post.id }
        : { kind: 'none' };
    case 'follow':
      return item.actor?.loginId
        ? { kind: 'profile', loginId: item.actor.loginId }
        : { kind: 'none' };
    case 'profile_approved':
    case 'profile_rejected':
      return { kind: 'ownProfile' };
    default:
      return { kind: 'none' };
  }
}
