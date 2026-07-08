import { describe, expect, it } from 'vitest';
import { resolveCommunityNotificationTarget } from './notificationTarget';
import type { CommunityNotification, CommunityUser } from './types';

const actor = { loginId: 'alice', displayName: 'Alice' } as CommunityUser;
const post = { id: 'post-1', title: 'Hello', imageUrl: '/img' };

function item(
  type: CommunityNotification['type'],
  overrides: Partial<CommunityNotification> = {},
): CommunityNotification {
  return {
    id: 'n1',
    type,
    createdAt: '2026-01-01T00:00:00.000Z',
    read: false,
    actor,
    post: null,
    ...overrides,
  };
}

describe('resolveCommunityNotificationTarget', () => {
  it('opens the post for like and moderation notifications', () => {
    expect(resolveCommunityNotificationTarget(item('like', { post }))).toEqual({
      kind: 'post',
      postId: 'post-1',
    });
    expect(resolveCommunityNotificationTarget(item('post_approved', { post }))).toEqual({
      kind: 'post',
      postId: 'post-1',
    });
    expect(resolveCommunityNotificationTarget(item('comment_approved', { post }))).toEqual({
      kind: 'post',
      postId: 'post-1',
    });
  });

  it('opens the actor profile for follows', () => {
    expect(resolveCommunityNotificationTarget(item('follow'))).toEqual({
      kind: 'profile',
      loginId: 'alice',
    });
  });

  it('opens own profile for profile review results', () => {
    expect(resolveCommunityNotificationTarget(item('profile_approved'))).toEqual({
      kind: 'ownProfile',
    });
  });

  it('falls back when the post is missing', () => {
    expect(resolveCommunityNotificationTarget(item('like'))).toEqual({ kind: 'none' });
  });
});
