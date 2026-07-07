import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  type AnimationEvent,
} from 'react';
import type { AppLanguage } from '../../../i18n/messages';
import storage from '../../../lib/storage';
import { SK } from '../../../shared/constants';
import { communityApi } from '../../../services/community-api';
import { setCommunityApiOrigin, setCommunityRequestLoginId } from '../api/runtime';
import { SOCIAL_PLATFORMS } from '../constants';
import { formString, optionalFormString } from '../forms/formData';
import { COMMUNITY_TIMING } from '../timing';
import type { CommunityComment, CommunityNotification, CommunityPage, CommunityPost, CommunityUser } from '../types';
import { communityReducer, createCommunityState } from './reducer';
import type { CommunityActions, CommunityState, CommunityStateDispatch } from './types';
import { useCommunityImageInputs } from './useCommunityImageInputs';
import { useCommunityLoaders } from './useCommunityLoaders';
import { useCommunityTimelineStream } from './useCommunityTimelineStream';
import { useObjectUrlRegistry } from './useObjectUrlRegistry';

const CommunityStateContext = createContext<CommunityState | null>(null);
const CommunityActionsContext = createContext<CommunityActions | null>(null);

type CommunityStreamUiContextValue = {
  streamDisconnected: boolean;
  streamConnecting: boolean;
  reconnectStream: () => void;
  notificationToast: CommunityNotification | null;
  notificationToastClosing: boolean;
  dismissNotificationToast: () => void;
  handleNotificationToastAnimationEnd: (event: AnimationEvent<HTMLDivElement>) => void;
};

const CommunityStreamUiContext = createContext<CommunityStreamUiContextValue | null>(null);

function useCommunitySetter<Key extends keyof CommunityState>(
  dispatch: CommunityStateDispatch,
  key: Key,
) {
  return useCallback(
    (value: SetStateAction<CommunityState[Key]>) => dispatch({ type: 'set', key, value } as never),
    [dispatch, key],
  );
}

export function CommunityProvider({
  language,
  apiOrigin,
  onClose,
  children,
}: {
  language: AppLanguage;
  apiOrigin: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(communityReducer, createCommunityState(language === 'ja'));
  const {
    ja,
    page,
    modal,
    ownPosts,
    profileUser,
    user,
    token,
    query,
    tag,
    refreshing,
    busy,
    postImages,
    avatarImage,
    headerImage,
    closing,
    notifications,
  } = state;
  const setPage = useCommunitySetter(dispatch, 'page');
  const setModal = useCommunitySetter(dispatch, 'modal');
  const setPosts = useCommunitySetter(dispatch, 'posts');
  const setOwnPosts = useCommunitySetter(dispatch, 'ownPosts');
  const setFollowingPosts = useCommunitySetter(dispatch, 'followingPosts');
  const setBookmarkedPosts = useCommunitySetter(dispatch, 'bookmarkedPosts');
  const setKnownTags = useCommunitySetter(dispatch, 'knownTags');
  const setSearchUsers = useCommunitySetter(dispatch, 'searchUsers');
  const setNotifications = useCommunitySetter(dispatch, 'notifications');
  const setUnreadCount = useCommunitySetter(dispatch, 'unreadCount');
  const setProfileUser = useCommunitySetter(dispatch, 'profileUser');
  const setProfilePosts = useCommunitySetter(dispatch, 'profilePosts');
  const setUser = useCommunitySetter(dispatch, 'user');
  const setToken = useCommunitySetter(dispatch, 'token');
  const setQuery = useCommunitySetter(dispatch, 'query');
  const setTag = useCommunitySetter(dispatch, 'tag');
  const setLoading = useCommunitySetter(dispatch, 'loading');
  const setRefreshing = useCommunitySetter(dispatch, 'refreshing');
  const setBusy = useCommunitySetter(dispatch, 'busy');
  const setError = useCommunitySetter(dispatch, 'error');
  const setPostImages = useCommunitySetter(dispatch, 'postImages');
  const setAvatarImage = useCommunitySetter(dispatch, 'avatarImage');
  const setHeaderImage = useCommunitySetter(dispatch, 'headerImage');
  const { readPostFiles, readAvatar, readHeader } = useCommunityImageInputs({
    ja,
    setError,
    setPostImages,
    setAvatarImage,
    setHeaderImage,
  });

  useEffect(() => {
    setCommunityApiOrigin(apiOrigin);
    return () => setCommunityApiOrigin('');
  }, [apiOrigin]);
  const setClosing = useCommunitySetter(dispatch, 'closing');
  const objectUrls = useObjectUrlRegistry();
  const profileObjectUrls = useObjectUrlRegistry();
  const {
    loadFeed,
    loadOwn,
    loadFollowing,
    loadBookmarks,
    hydrateOwnProfileImages,
    refreshOwnProfile,
    loadNotifications,
    loadKnownTags,
  } = useCommunityLoaders({
    ja,
    objectUrls,
    profileObjectUrls,
    setPosts,
    setOwnPosts,
    setFollowingPosts,
    setBookmarkedPosts,
    setKnownTags,
    setNotifications,
    setUnreadCount,
    setProfileUser,
    setProfilePosts,
    setUser,
    setLoading,
    setError,
  });
  const {
    streamDisconnected,
    streamConnecting,
    reconnectStream,
    notificationToast,
    notificationToastClosing,
    dismissNotificationToast,
    handleNotificationToastAnimationEnd,
  } = useCommunityTimelineStream({
    token,
    page,
    query,
    tag,
    notifications,
    dispatch,
    loadNotifications,
    loadFollowing,
    setKnownTags,
  });
  const recordedImpressions = useRef<Set<string>>(new Set());
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    dispatch({
      type: 'patch',
      value: { ja: language === 'ja' },
    });
  }, [language]);

  useEffect(() => {
    recordedImpressions.current.clear();
  }, [token]);

  useEffect(() => {
    if (page !== 'profile' || !user || !profileUser) return;
    if (profileUser.loginId.toLowerCase() !== user.loginId.toLowerCase()) return;
    setProfilePosts(ownPosts);
  }, [ownPosts, page, profileUser, setProfilePosts, user]);

  useEffect(() => {
    setCommunityRequestLoginId(user?.loginId);
    return () => setCommunityRequestLoginId(null);
  }, [user?.loginId]);

  const closeDrawer = useCallback(() => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, COMMUNITY_TIMING.drawerCloseMs);
  }, [closing, onClose, setClosing]);

  useEffect(() => {
    void loadFeed();
    void loadKnownTags();
    void (async () => {
      const saved = await storage.get(SK.communityAuthToken);
      const storedToken = saved[SK.communityAuthToken];
      const authToken = typeof storedToken === 'string' ? storedToken : '';
      if (!authToken) return;
      try {
        const result = await communityApi.session(authToken);
        setCommunityRequestLoginId(result.user.loginId);
        const hydratedUser = await hydrateOwnProfileImages(result.user, authToken);
        setToken(authToken);
        setUser(hydratedUser);
        setProfileUser(hydratedUser);
        void loadFeed(authToken);
        void loadOwn(authToken);
        void loadFollowing(authToken);
        void loadBookmarks(authToken);
        void loadNotifications(authToken);
      } catch {
        setCommunityRequestLoginId(null);
        await storage.set({ [SK.communityAuthToken]: '' });
      }
    })();
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, [
    hydrateOwnProfileImages,
    loadFeed,
    loadBookmarks,
    loadFollowing,
    loadKnownTags,
    loadNotifications,
    loadOwn,
    refreshOwnProfile,
    setProfileUser,
    setToken,
    setUser,
  ]);

  useEffect(() => {
    if (page !== 'explore') return;
    const value = query.trim();
    if (!value) {
      setSearchUsers([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void communityApi.searchUsers(value, token || undefined).then(
        (result) => {
          if (!cancelled) setSearchUsers(result.users);
        },
        () => {
          if (!cancelled) setSearchUsers([]);
        },
      );
    }, COMMUNITY_TIMING.searchDebounceMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, query, setSearchUsers, token]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (modal.kind !== 'none' && !busy) setModal({ kind: 'none' });
      else closeDrawer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, closeDrawer, modal.kind, setModal]);

  const go = (next: CommunityPage) => {
    if (next === 'following' && !user) {
      setModal({ kind: 'auth', mode: 'login' });
      return;
    }
    if (next === 'bookmarks' && !user) {
      setModal({ kind: 'auth', mode: 'login' });
      return;
    }
    if (next === 'notifications' && !user) {
      setModal({ kind: 'auth', mode: 'login' });
      return;
    }
    if (next === 'create') {
      setPostImages([]);
      setModal(user ? { kind: 'create' } : { kind: 'auth', mode: 'login' });
      return;
    }
    if (next === 'profile' && !user) {
      setModal({ kind: 'auth', mode: 'login' });
      return;
    }
    setPage(next);
    if (next === 'profile' && user) {
      setProfileUser(user);
      setProfilePosts(ownPosts);
      if (token) {
        void refreshOwnProfile(user.loginId, token).catch(() => undefined);
      }
    }
    if (next === 'following' && token) void loadFollowing(token);
    if (next === 'bookmarks' && token) void loadBookmarks(token);
    if (next === 'notifications' && token) {
      void loadNotifications(token).then(() => {
        void communityApi.readNotifications(token).then(() => setUnreadCount(0));
      });
    }
  };

  const openProfile = async (loginId: string) => {
    const normalized = loginId.trim();
    if (!normalized) return;
    setLoading(true);
    setError('');
    try {
      if (user && normalized.toLowerCase() === user.loginId.toLowerCase()) {
        await refreshOwnProfile(normalized, token);
      } else {
        const [profile, profileFeed] = await Promise.all([
          communityApi.user(normalized, token || undefined),
          communityApi.userPosts(normalized, token || undefined),
        ]);
        setProfileUser(profile.user);
        setProfilePosts(profileFeed.posts);
      }
      setModal({ kind: 'none' });
      setPage('profile');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load profile');
    } finally {
      setLoading(false);
    }
  };

  const openPost = (post: CommunityPost) => {
    setModal({ kind: 'post', post });
    communityApi
      .post(post.id, token || undefined)
      .then((result) => {
        dispatch({ type: 'patchPost', postId: post.id, value: result.post });
      })
      .catch(() => undefined);
  };

  const openTag = (nextTag: string) => {
    setTag(nextTag);
    setQuery(`#${nextTag}`);
    setPage('explore');
    setError('');
    setModal({ kind: 'none' });
  };

  const openConnections = async (profile: CommunityUser, relation: 'followers' | 'following') => {
    setError('');
    setModal({
      kind: 'connections',
      relation,
      ownerName: profile.displayName,
      users: [],
      loading: true,
    });
    try {
      const result =
        relation === 'followers'
          ? await communityApi.followers(profile.loginId, token || undefined)
          : await communityApi.following(profile.loginId, token || undefined);
      setModal((current) =>
        current.kind === 'connections' && current.relation === relation
          ? { ...current, users: result.users, loading: false }
          : current,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load users');
      setModal((current) =>
        current.kind === 'connections' ? { ...current, loading: false } : current,
      );
    }
  };

  const authenticate = async (event: FormEvent<HTMLFormElement>, mode: 'login' | 'register') => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    if (
      mode === 'register' &&
      form.get('communitySecret') !== form.get('communitySecretConfirmation')
    ) {
      setError(ja ? 'パスワードが一致しません。' : 'Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await communityApi.authenticate(mode, {
        loginId: formString(form, 'communityLoginId'),
        displayName: optionalFormString(form, 'displayName'),
        password: formString(form, 'communitySecret'),
      });
      await storage.set({ [SK.communityAuthToken]: result.token });
      setCommunityRequestLoginId(result.user.loginId);
      const hydratedUser = await hydrateOwnProfileImages(result.user, result.token);
      setToken(result.token);
      setUser(hydratedUser);
      setProfileUser(hydratedUser);
      setModal({ kind: 'none' });
      void loadFeed(result.token);
      void loadOwn(result.token);
      void loadFollowing(result.token);
      void loadBookmarks(result.token);
      void loadNotifications(result.token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (token) await communityApi.logout(token).catch(() => undefined);
    setCommunityRequestLoginId(null);
    await storage.set({ [SK.communityAuthToken]: '' });
    objectUrls.current.forEach(URL.revokeObjectURL);
    objectUrls.current = [];
    profileObjectUrls.current.forEach(URL.revokeObjectURL);
    profileObjectUrls.current = [];
    dispatch({ type: 'resetSession' });
  };

  const submitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!postImages.length || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await Promise.all([
        communityApi.createPost(token, {
          title: formString(form, 'title'),
          caption: formString(form, 'caption'),
          imageDataUrls: postImages,
        }),
        new Promise((resolve) =>
          window.setTimeout(resolve, COMMUNITY_TIMING.postSubmitMinimumBusyMs),
        ),
      ]);
      setPostImages([]);
      setModal({ kind: 'sent' });
      await loadOwn(token);
      void loadBookmarks(token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit post');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await communityApi.updateAcademicProfile(
        token,
        formString(form, 'academicGroup'),
        formString(form, 'department'),
      );
      const result = await communityApi.updateProfile(token, {
        displayName: formString(form, 'displayName'),
        bio: formString(form, 'bio'),
        websiteUrl: formString(form, 'websiteUrl'),
        profileTags: formString(form, 'profileTags'),
        socialLinks: Object.fromEntries(
          SOCIAL_PLATFORMS.map((platform) => [
            platform.key,
            formString(form, `social_${platform.key}`),
          ]),
        ),
      });
      if (avatarImage) await communityApi.submitAvatar(token, avatarImage);
      if (headerImage) await communityApi.submitHeader(token, headerImage);
      const refreshed = avatarImage || headerImage ? await communityApi.session(token) : result;
      const hydratedUser = await hydrateOwnProfileImages(refreshed.user, token);
      setUser(hydratedUser);
      setProfileUser(hydratedUser);
      setAvatarImage('');
      setHeaderImage('');
      setModal({ kind: 'none' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update profile');
    } finally {
      setBusy(false);
    }
  };

  const removePost = async (post: CommunityPost) => {
    setBusy(true);
    setError('');
    try {
      await communityApi.deletePost(token, post.id);
      dispatch({ type: 'removePost', postId: post.id });
      setModal({ kind: 'none' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete post');
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (post: CommunityPost, comment: CommunityComment) => {
    setBusy(true);
    setError('');
    try {
      await communityApi.deleteComment(token, post.id, comment.id);
      setModal({ kind: 'post', post });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete comment');
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = async (post: CommunityPost) => {
    if (!token) {
      setModal({ kind: 'auth', mode: 'login' });
      return;
    }
    const next = {
      likedByMe: !post.likedByMe,
      likeCount: Math.max(0, post.likeCount + (post.likedByMe ? -1 : 1)),
    };
    dispatch({ type: 'patchPost', postId: post.id, value: next });
    try {
      const result = post.likedByMe
        ? await communityApi.unlikePost(token, post.id)
        : await communityApi.likePost(token, post.id);
      const confirmed = { likedByMe: result.likedByMe, likeCount: result.likeCount };
      dispatch({ type: 'patchPost', postId: post.id, value: confirmed });
    } catch (cause) {
      dispatch({ type: 'restorePost', post });
      setError(cause instanceof Error ? cause.message : 'Could not update like');
    }
  };

  const toggleBookmark = async (post: CommunityPost) => {
    if (!token) {
      setModal({ kind: 'auth', mode: 'login' });
      return;
    }
    const nextBookmarked = !post.bookmarkedByMe;
    dispatch({
      type: 'patchPost',
      postId: post.id,
      value: {
        bookmarkedByMe: nextBookmarked,
        bookmarkCount: Math.max(0, post.bookmarkCount + (nextBookmarked ? 1 : -1)),
      },
    });
    try {
      const result = nextBookmarked
        ? await communityApi.bookmarkPost(token, post.id)
        : await communityApi.unbookmarkPost(token, post.id);
      dispatch({ type: 'patchPost', postId: post.id, value: result });
      if (nextBookmarked) {
        setBookmarkedPosts((current) =>
          current.some((item) => item.id === post.id)
            ? current
            : [{ ...post, ...result }, ...current],
        );
      } else {
        setBookmarkedPosts((current) => current.filter((item) => item.id !== post.id));
      }
    } catch (cause) {
      dispatch({ type: 'restorePost', post });
      setError(cause instanceof Error ? cause.message : 'Could not update bookmark');
    }
  };

  const recordImpression = (post: CommunityPost) => {
    if (recordedImpressions.current.has(post.id)) return;
    recordedImpressions.current.add(post.id);
    communityApi
      .recordImpression(post.id, token || undefined)
      .then((result) => {
        dispatch({
          type: 'patchPost',
          postId: post.id,
          value: { impressionCount: result.impressionCount },
        });
      })
      .catch(() => {
        recordedImpressions.current.delete(post.id);
      });
  };

  const toggleFollow = async (target: CommunityUser) => {
    if (!token) {
      setModal({ kind: 'auth', mode: 'login' });
      return;
    }
    if (user && target.loginId.toLowerCase() === user.loginId.toLowerCase()) return;
    const next = {
      ...target,
      followedByMe: !target.followedByMe,
      followerCount: Math.max(0, (target.followerCount ?? 0) + (target.followedByMe ? -1 : 1)),
    };
    setProfileUser(next);
    setUser((current) =>
      current
        ? {
            ...current,
            followingCount: Math.max(
              0,
              (current.followingCount ?? 0) + (target.followedByMe ? -1 : 1),
            ),
          }
        : current,
    );
    try {
      const result = target.followedByMe
        ? await communityApi.unfollowUser(token, target.loginId)
        : await communityApi.followUser(token, target.loginId);
      setProfileUser({ ...target, ...result });
      void loadFollowing(token);
    } catch {
      setProfileUser(target);
      setUser((current) =>
        current
          ? {
              ...current,
              followingCount: Math.max(
                0,
                (current.followingCount ?? 0) + (target.followedByMe ? 1 : -1),
              ),
            }
          : current,
      );
    }
  };

  const refreshCurrentPage = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError('');
    try {
      if (page === 'following' && token) {
        await loadFollowing(token);
      } else if (page === 'bookmarks' && token) {
        await loadBookmarks(token);
      } else if (page === 'notifications' && token) {
        await loadNotifications(token);
      } else if (page === 'profile' && profileUser) {
        if (
          user &&
          profileUser.loginId.toLocaleLowerCase() === user.loginId.toLocaleLowerCase()
        ) {
          await refreshOwnProfile(profileUser.loginId, token);
        } else {
          await openProfile(profileUser.loginId);
        }
      } else {
        await loadFeed(token || undefined, true);
      }
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, COMMUNITY_TIMING.refreshMinimumBusyMs),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : ja
            ? '更新できませんでした。'
            : 'Could not refresh.',
      );
    } finally {
      setRefreshing(false);
    }
  };

  const openLikes = (post: CommunityPost) => {
    setModal({ kind: 'likes', post, users: [], loading: true });
    void communityApi
      .postLikes(post.id, token || undefined)
      .then((result) =>
        setModal((current) =>
          current.kind === 'likes' ? { ...current, users: result.users, loading: false } : current,
        ),
      )
      .catch(() =>
        setModal((current) =>
          current.kind === 'likes' ? { ...current, loading: false } : current,
        ),
      );
  };

  const actions: CommunityActions = {
    closeDrawer,
    loadFeed,
    go,
    openProfile,
    openPost,
    openTag,
    openConnections,
    authenticate,
    logout,
    submitPost,
    saveProfile,
    removePost,
    removeComment,
    toggleLike,
    toggleBookmark,
    recordImpression,
    toggleFollow,
    refreshCurrentPage,
    openLikes,
    openProfileEditor: () =>
      dispatch({
        type: 'patch',
        value: { avatarImage: '', headerImage: '', modal: { kind: 'profile' } },
      }),
    closeModal: () => {
      if (!busy) {
        setError('');
        setModal({ kind: 'none' });
      }
    },
    setAuthMode: (mode) => {
      setError('');
      setModal({ kind: 'auth', mode });
    },
    setModal,
    setQuery,
    setTag,
    setPostImages,
    readPostFiles,
    readAvatar,
    readHeader,
    canDeletePost: (post) =>
      Boolean(
        user &&
          (post.authorLoginId?.toLocaleLowerCase() === user.loginId.toLocaleLowerCase() ||
            ownPosts.some((owned) => owned.id === post.id)),
      ),
  };
  return (
    <CommunityActionsContext.Provider value={actions}>
      <CommunityStateContext.Provider value={state}>
        <CommunityStreamUiContext.Provider
          value={{
            streamDisconnected,
            streamConnecting,
            reconnectStream,
            notificationToast,
            notificationToastClosing,
            dismissNotificationToast,
            handleNotificationToastAnimationEnd,
          }}
        >
          {children}
        </CommunityStreamUiContext.Provider>
      </CommunityStateContext.Provider>
    </CommunityActionsContext.Provider>
  );
}

export function useCommunityState(): CommunityState {
  const context = useContext(CommunityStateContext);
  if (!context) throw new Error('useCommunityState must be used inside CommunityProvider');
  return context;
}

export function useCommunityActions(): CommunityActions {
  const context = useContext(CommunityActionsContext);
  if (!context) throw new Error('useCommunityActions must be used inside CommunityProvider');
  return context;
}

export function useCommunityStreamUi(): CommunityStreamUiContextValue {
  const context = useContext(CommunityStreamUiContext);
  if (!context) throw new Error('useCommunityStreamUi must be used inside CommunityProvider');
  return context;
}
