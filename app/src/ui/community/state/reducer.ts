import { ALL_TAG } from '../constants';
import type { CommunityPost } from '../types';
import type { CommunityAction, CommunityState } from './types';

export function createCommunityState(ja: boolean): CommunityState {
  return {
    ja,
    page: 'home',
    modal: { kind: 'none' },
    posts: [],
    ownPosts: [],
    followingPosts: [],
    bookmarkedPosts: [],
    knownTags: [],
    searchUsers: [],
    notifications: [],
    unreadCount: 0,
    profileUser: null,
    profilePosts: [],
    user: null,
    token: '',
    query: '',
    tag: ALL_TAG,
    loading: true,
    refreshing: false,
    busy: false,
    error: '',
    postImages: [],
    avatarImage: '',
    headerImage: '',
    closing: false,
  };
}

function updatePostList(
  posts: CommunityPost[],
  postId: string,
  value: Partial<CommunityPost>,
): CommunityPost[] {
  return posts.map((post) => (post.id === postId ? { ...post, ...value } : post));
}

function removePostFromList(posts: CommunityPost[], postId: string): CommunityPost[] {
  return posts.filter((post) => post.id !== postId);
}

function updatePostEverywhere(
  state: CommunityState,
  postId: string,
  value: Partial<CommunityPost>,
): CommunityState {
  const modal =
    state.modal.kind === 'post' && state.modal.post.id === postId
      ? { ...state.modal, post: { ...state.modal.post, ...value } }
      : state.modal;
  return {
    ...state,
    posts: updatePostList(state.posts, postId, value),
    ownPosts: updatePostList(state.ownPosts, postId, value),
    profilePosts: updatePostList(state.profilePosts, postId, value),
    followingPosts: updatePostList(state.followingPosts, postId, value),
    bookmarkedPosts: updatePostList(state.bookmarkedPosts, postId, value),
    modal,
  };
}

export function communityReducer(state: CommunityState, action: CommunityAction): CommunityState {
  switch (action.type) {
    case 'set': {
      const current = state[action.key];
      const value =
        typeof action.value === 'function'
          ? (action.value as (value: typeof current) => typeof current)(current)
          : action.value;
      return { ...state, [action.key]: value };
    }
    case 'patch':
      return { ...state, ...action.value };
    case 'patchPost':
      return updatePostEverywhere(state, action.postId, action.value);
    case 'restorePost':
      return updatePostEverywhere(state, action.post.id, action.post);
    case 'removePost':
      return {
        ...state,
        posts: removePostFromList(state.posts, action.postId),
        ownPosts: removePostFromList(state.ownPosts, action.postId),
        profilePosts: removePostFromList(state.profilePosts, action.postId),
        followingPosts: removePostFromList(state.followingPosts, action.postId),
        bookmarkedPosts: removePostFromList(state.bookmarkedPosts, action.postId),
      };
    case 'prependPost': {
      const exists = state.posts.some((post) => post.id === action.post.id);
      const nextPosts = exists
        ? updatePostList(state.posts, action.post.id, action.post)
        : [action.post, ...state.posts].slice(0, 30);
      const next = updatePostEverywhere(state, action.post.id, action.post);
      return { ...next, posts: nextPosts };
    }
    case 'resetSession':
      return {
        ...state,
        page: 'home',
        modal: { kind: 'none' },
        ownPosts: [],
        followingPosts: [],
        bookmarkedPosts: [],
        notifications: [],
        unreadCount: 0,
        profileUser: null,
        profilePosts: [],
        user: null,
        token: '',
        postImages: [],
        avatarImage: '',
        headerImage: '',
        busy: false,
        error: '',
      };
  }
}
