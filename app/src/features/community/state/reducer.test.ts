import { describe, expect, it } from 'vitest';
import type { CommunityPost } from '../types';
import { communityReducer, createCommunityState } from './reducer';

const post: CommunityPost = {
  id: 'post-1',
  authorName: 'User',
  authorLoginId: 'user',
  authorAvatarUrl: null,
  title: 'Title',
  caption: 'Caption',
  tags: [],
  imageUrl: '/image',
  imageUrls: ['/image'],
  createdAt: '2026-07-04T00:00:00Z',
  likeCount: 0,
  likedByMe: false,
  bookmarkCount: 0,
  bookmarkedByMe: false,
  commentCount: 0,
  impressionCount: 0,
  status: 'approved',
  rejectionReason: null,
};

describe('communityReducer', () => {
  it('creates the initial state', () => {
    const state = createCommunityState(true, 'Student');
    expect(state.page).toBe('home');
    expect(state.ja).toBe(true);
    expect(state.defaultAuthorName).toBe('Student');
  });

  it('changes the current page', () => {
    const state = createCommunityState(true, 'Student');
    expect(communityReducer(state, { type: 'set', key: 'page', value: 'explore' }).page).toBe(
      'explore',
    );
  });

  it('patches a post in every collection and an open post dialog', () => {
    const state = {
      ...createCommunityState(true, 'Student'),
      posts: [post],
      ownPosts: [post],
      profilePosts: [post],
      followingPosts: [post],
      modal: { kind: 'post' as const, post },
    };
    const updated = communityReducer(state, {
      type: 'patchPost',
      postId: post.id,
      value: { likedByMe: true, likeCount: 1 },
    });
    expect(updated.posts[0].likeCount).toBe(1);
    expect(updated.ownPosts[0].likedByMe).toBe(true);
    expect(updated.profilePosts[0].likeCount).toBe(1);
    expect(updated.followingPosts[0].likeCount).toBe(1);
    expect(updated.modal.kind === 'post' ? updated.modal.post.likeCount : 0).toBe(1);
  });

  it('restores an optimistic post update', () => {
    const optimistic = { ...post, likedByMe: true, likeCount: 1 };
    const state = { ...createCommunityState(true, 'Student'), posts: [optimistic] };
    expect(communityReducer(state, { type: 'restorePost', post }).posts[0]).toEqual(post);
  });

  it('clears session-owned state on logout without discarding the public feed', () => {
    const state = {
      ...createCommunityState(true, 'Student'),
      posts: [post],
      ownPosts: [post],
      token: 'token',
      page: 'profile' as const,
    };
    const reset = communityReducer(state, { type: 'resetSession' });
    expect(reset.posts).toEqual([post]);
    expect(reset.ownPosts).toEqual([]);
    expect(reset.token).toBe('');
    expect(reset.page).toBe('home');
  });
});
