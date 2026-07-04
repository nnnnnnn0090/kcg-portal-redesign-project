import { ALL_TAG } from '../constants';
import type { CommunityPost } from '../types';
import type { CommunityAction, CommunityState } from './types';

export function createCommunityState(ja: boolean, defaultAuthorName: string): CommunityState {
  return {
    ja,
    defaultAuthorName,
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
