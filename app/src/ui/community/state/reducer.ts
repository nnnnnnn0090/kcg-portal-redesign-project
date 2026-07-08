import { ALL_TAG } from '../constants';
import type { CommunityPost, CommunityUser } from '../types';
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
    commentsRevision: 0,
    postsNextCursor: null,
    followingNextCursor: null,
    feedLoadingMore: false,
  };
}

function modalAfterPostRemoval(
  modal: CommunityState['modal'],
  postId: string,
): CommunityState['modal'] {
  if (
    (modal.kind === 'post' ||
      modal.kind === 'likes' ||
      modal.kind === 'delete' ||
      modal.kind === 'deleteComment') &&
    modal.post.id === postId
  ) {
    return {
      kind: 'unavailable',
      title: { ja: '投稿が見つかりません', en: 'Post unavailable' },
      body: {
        ja: 'この投稿は削除されたか、公開が解除されました。',
        en: 'This post was deleted or is no longer public.',
      },
    };
  }
  return modal;
}

function upsertPostInList(posts: CommunityPost[], post: CommunityPost): CommunityPost[] {
  const exists = posts.some((item) => item.id === post.id);
  return exists ? updatePostList(posts, post.id, post) : [post, ...posts];
}

function updatePostList(
  posts: CommunityPost[],
  postId: string,
  value: Partial<CommunityPost>,
): CommunityPost[] {
  return posts.map((post) => {
    if (post.id !== postId) return post;
    const next = { ...post, ...value };
    // Stream payloads omit viewer-personal fields; never wipe them accidentally.
    if (!Object.prototype.hasOwnProperty.call(value, 'likedByMe')) {
      next.likedByMe = post.likedByMe;
    }
    if (!Object.prototype.hasOwnProperty.call(value, 'bookmarkedByMe')) {
      next.bookmarkedByMe = post.bookmarkedByMe;
    }
    if (!Object.prototype.hasOwnProperty.call(value, 'previewUrl')) {
      next.previewUrl = post.previewUrl;
    }
    return next;
  });
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
    (state.modal.kind === 'post' ||
      state.modal.kind === 'likes' ||
      state.modal.kind === 'delete' ||
      state.modal.kind === 'deleteComment') &&
    state.modal.post.id === postId
      ? {
          ...state.modal,
          post: updatePostList([state.modal.post], postId, value)[0],
        }
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

function patchAuthorFields(
  posts: CommunityPost[],
  loginId: string,
  user: CommunityUser,
): CommunityPost[] {
  const needle = loginId.toLocaleLowerCase();
  return posts.map((post) =>
    post.authorLoginId.toLocaleLowerCase() === needle
      ? {
          ...post,
          authorName: user.displayName,
          authorVerified: user.verified,
          authorAvatarUrl: user.avatarUrl,
        }
      : post,
  );
}

function applyProfileUpdated(state: CommunityState, user: CommunityUser): CommunityState {
  const loginId = user.loginId;
  const needle = loginId.toLocaleLowerCase();
  const nextUser =
    state.user && state.user.loginId.toLocaleLowerCase() === needle
      ? { ...state.user, ...user, pendingProfile: state.user.pendingProfile }
      : state.user;
  const nextProfile =
    state.profileUser && state.profileUser.loginId.toLocaleLowerCase() === needle
      ? {
          ...state.profileUser,
          ...user,
          followedByMe: state.profileUser.followedByMe,
          pendingProfile:
            nextUser && nextUser.loginId.toLocaleLowerCase() === needle
              ? nextUser.pendingProfile
              : state.profileUser.pendingProfile,
        }
      : state.profileUser;
  return {
    ...state,
    user: nextUser,
    profileUser: nextProfile,
    posts: patchAuthorFields(state.posts, loginId, user),
    ownPosts: patchAuthorFields(state.ownPosts, loginId, user),
    profilePosts: patchAuthorFields(state.profilePosts, loginId, user),
    followingPosts: patchAuthorFields(state.followingPosts, loginId, user),
    bookmarkedPosts: patchAuthorFields(state.bookmarkedPosts, loginId, user),
    searchUsers: state.searchUsers.map((item) =>
      item.loginId.toLocaleLowerCase() === needle
        ? { ...item, ...user, followedByMe: item.followedByMe }
        : item,
    ),
  };
}

function applyFollowUpdated(
  state: CommunityState,
  payload: Extract<CommunityAction, { type: 'followUpdated' }>,
): CommunityState {
  const target = payload.targetLoginId.toLocaleLowerCase();
  const actor = payload.actorLoginId.toLocaleLowerCase();
  const patchUser = (user: CommunityUser | null): CommunityUser | null => {
    if (!user) return user;
    const login = user.loginId.toLocaleLowerCase();
    if (login === target) {
      return {
        ...user,
        followerCount: payload.followerCount,
        followedByMe:
          state.user && state.user.loginId.toLocaleLowerCase() === actor
            ? payload.followed
            : user.followedByMe,
      };
    }
    if (login === actor) {
      return { ...user, followingCount: payload.actorFollowingCount };
    }
    return user;
  };
  return {
    ...state,
    user: patchUser(state.user),
    profileUser: patchUser(state.profileUser),
    searchUsers: state.searchUsers.map((item) => {
      const login = item.loginId.toLocaleLowerCase();
      if (login === target) {
        return {
          ...item,
          followerCount: payload.followerCount,
          followedByMe:
            state.user && state.user.loginId.toLocaleLowerCase() === actor
              ? payload.followed
              : item.followedByMe,
        };
      }
      if (login === actor) {
        return { ...item, followingCount: payload.actorFollowingCount };
      }
      return item;
    }),
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
        // Keep ownPosts so demoted/rejected owner copies can refresh via loadOwn.
        posts: removePostFromList(state.posts, action.postId),
        profilePosts: removePostFromList(state.profilePosts, action.postId),
        followingPosts: removePostFromList(state.followingPosts, action.postId),
        bookmarkedPosts: removePostFromList(state.bookmarkedPosts, action.postId),
        modal: modalAfterPostRemoval(state.modal, action.postId),
      };
    case 'prependPost': {
      const existing =
        state.posts.find((post) => post.id === action.post.id) ||
        state.followingPosts.find((post) => post.id === action.post.id) ||
        state.bookmarkedPosts.find((post) => post.id === action.post.id) ||
        state.ownPosts.find((post) => post.id === action.post.id);
      const withFlags = {
        ...action.post,
        likedByMe: existing?.likedByMe ?? false,
        bookmarkedByMe: existing?.bookmarkedByMe ?? false,
        previewUrl: existing?.previewUrl ?? action.post.previewUrl,
      };
      const authorLogin = withFlags.authorLoginId.toLocaleLowerCase();
      const mergedEverywhere = updatePostEverywhere(state, withFlags.id, withFlags);
      return {
        ...mergedEverywhere,
        posts: upsertPostInList(state.posts, withFlags).slice(0, 30),
        ownPosts:
          state.user && state.user.loginId.toLocaleLowerCase() === authorLogin
            ? upsertPostInList(state.ownPosts, withFlags)
            : state.ownPosts,
        profilePosts:
          state.profileUser &&
          state.profileUser.loginId.toLocaleLowerCase() === authorLogin
            ? upsertPostInList(state.profilePosts, withFlags)
            : state.profilePosts,
      };
    }
    case 'bumpCommentsRevision':
      return { ...state, commentsRevision: state.commentsRevision + 1 };
    case 'profileUpdated':
      return applyProfileUpdated(state, action.user);
    case 'followUpdated':
      return applyFollowUpdated(state, action);
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
        commentsRevision: 0,
        postsNextCursor: null,
        followingNextCursor: null,
        feedLoadingMore: false,
      };
  }
}
