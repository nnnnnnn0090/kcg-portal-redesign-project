import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { AppLanguage } from '../../../i18n/messages';
import storage from '../../../lib/storage';
import { SK } from '../../../shared/constants';
import { communityApi, setCommunityRequestLoginId } from '../api';
import { SOCIAL_PLATFORMS } from '../constants';
import { communityImageFiles, isCommunityImageFile } from '../imageFiles';
import type { CommunityPage, CommunityPost, CommunityUser } from '../types';
import { mergeOwnProfile } from '../utils';
import { communityReducer, createCommunityState } from './reducer';
import type { CommunityActions, CommunityState, CommunityStateDispatch } from './types';
import { useObjectUrlRegistry } from './useObjectUrlRegistry';

const CommunityStateContext = createContext<CommunityState | null>(null);
const CommunityActionsContext = createContext<CommunityActions | null>(null);

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
  defaultAuthorName,
  onClose,
  children,
}: {
  language: AppLanguage;
  defaultAuthorName: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(
    communityReducer,
    createCommunityState(language === 'ja', defaultAuthorName),
  );
  const {
    ja,
    page,
    modal,
    ownPosts,
    profileUser,
    user,
    token,
    query,
    refreshing,
    busy,
    postImages,
    avatarImage,
    headerImage,
    closing,
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
  const setClosing = useCommunitySetter(dispatch, 'closing');
  const objectUrls = useObjectUrlRegistry();
  const profileObjectUrls = useObjectUrlRegistry();
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    dispatch({
      type: 'patch',
      value: { ja: language === 'ja', defaultAuthorName },
    });
  }, [defaultAuthorName, language]);

  useEffect(() => {
    setCommunityRequestLoginId(user?.loginId);
    return () => setCommunityRequestLoginId(null);
  }, [user?.loginId]);

  const closeDrawer = useCallback(() => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 360);
  }, [closing, onClose, setClosing]);

  const loadFeed = useCallback(
    async (authToken?: string, silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        setPosts((await communityApi.posts(authToken)).posts);
      } catch {
        setError(
          ja
            ? 'コミュニティサーバーに接続できません。'
            : 'Could not connect to the community server.',
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [ja, setError, setLoading, setPosts],
  );

  const loadOwn = useCallback(
    async (authToken: string) => {
      objectUrls.current.forEach(URL.revokeObjectURL);
      objectUrls.current = [];
      try {
        const result = await communityApi.ownPosts(authToken);
        const hydrated = await Promise.all(
          result.posts.map(async (post) => {
            try {
              const count = Math.max(1, post.imageUrls?.length ?? 1);
              const imageUrls = await Promise.all(
                Array.from({ length: count }, (_, index) =>
                  count === 1
                    ? communityApi.ownPostImage(authToken, post.id)
                    : communityApi.ownPostImage(authToken, post.id, index),
                ),
              );
              return { ...post, previewUrl: imageUrls[0], imageUrls };
            } catch {
              return post;
            }
          }),
        );
        objectUrls.current = hydrated.flatMap(
          (post) => post.imageUrls ?? (post.previewUrl ? [post.previewUrl] : []),
        );
        setOwnPosts(hydrated);
        return hydrated;
      } catch {
        setOwnPosts([]);
        return [];
      }
    },
    [objectUrls, setOwnPosts],
  );

  const loadFollowing = useCallback(
    async (authToken: string) => {
      try {
        setFollowingPosts((await communityApi.followingPosts(authToken)).posts);
      } catch {
        setFollowingPosts([]);
      }
    },
    [setFollowingPosts],
  );

  const loadBookmarks = useCallback(
    async (authToken: string) => {
      try {
        setBookmarkedPosts((await communityApi.bookmarkedPosts(authToken)).posts);
      } catch {
        setBookmarkedPosts([]);
      }
    },
    [setBookmarkedPosts],
  );

  const hydrateOwnProfileImages = useCallback(
    async (source: CommunityUser, authToken: string) => {
      const next = { ...source };
      const urls: string[] = [];
      try {
        const avatarUrl = await communityApi.ownProfileImage(authToken, 'avatar');
        next.avatarUrl = avatarUrl;
        urls.push(avatarUrl);
      } catch {
        // 画像未設定なら通常の公開URLまたはプレースホルダーを使う。
      }
      try {
        const headerUrl = await communityApi.ownProfileImage(authToken, 'header');
        next.headerUrl = headerUrl;
        urls.push(headerUrl);
      } catch {
        // 画像未設定なら通常の公開URLまたは空状態を使う。
      }
      profileObjectUrls.current.forEach(URL.revokeObjectURL);
      profileObjectUrls.current = urls;
      return next;
    },
    [profileObjectUrls],
  );

  const loadNotifications = useCallback(
    async (authToken: string) => {
      try {
        const result = await communityApi.notifications(authToken);
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      } catch {
        setNotifications([]);
      }
    },
    [setNotifications, setUnreadCount],
  );

  const loadKnownTags = useCallback(async () => {
    try {
      setKnownTags((await communityApi.tags()).tags);
    } catch {
      setKnownTags([]);
    }
  }, [setKnownTags]);

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
      objectUrls.current.forEach(URL.revokeObjectURL);
      profileObjectUrls.current.forEach(URL.revokeObjectURL);
    };
  }, [
    hydrateOwnProfileImages,
    loadFeed,
    loadBookmarks,
    loadFollowing,
    loadKnownTags,
    loadNotifications,
    loadOwn,
    objectUrls,
    profileObjectUrls,
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
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, query, setSearchUsers, token]);

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => void loadNotifications(token), 30_000);
    return () => window.clearInterval(timer);
  }, [loadNotifications, token]);

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
    if (next === 'home' || next === 'explore') void loadFeed(token || undefined, true);
    if (next === 'profile' && user) {
      setProfileUser(user);
      setProfilePosts(ownPosts);
      if (token) {
        void Promise.all([
          communityApi.session(token),
          communityApi.user(user.loginId, token),
          loadOwn(token),
        ])
          .then(async ([session, profile, refreshedPosts]) => {
            const refreshedUser = await hydrateOwnProfileImages(
              mergeOwnProfile(session.user, profile.user),
              token,
            );
            setUser(refreshedUser);
            setProfileUser(refreshedUser);
            setProfilePosts(refreshedPosts);
          })
          .catch(() => undefined);
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
        const [session, profile, refreshedPosts] = await Promise.all([
          communityApi.session(token),
          communityApi.user(normalized, token),
          loadOwn(token),
        ]);
        const refreshedUser = await hydrateOwnProfileImages(
          mergeOwnProfile(session.user, profile.user),
          token,
        );
        setUser(refreshedUser);
        setProfileUser(refreshedUser);
        setProfilePosts(refreshedPosts);
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
        loginId: form.get('communityLoginId'),
        displayName: form.get('displayName'),
        password: form.get('communitySecret'),
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
          title: form.get('title'),
          caption: form.get('caption'),
          imageDataUrls: postImages,
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1200)),
      ]);
      setPostImages([]);
      setModal({ kind: 'sent' });
      void loadOwn(token);
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
        String(form.get('academicGroup') ?? ''),
        String(form.get('department') ?? ''),
      );
      const result = await communityApi.updateProfile(token, {
        displayName: form.get('displayName'),
        bio: form.get('bio'),
        websiteUrl: form.get('websiteUrl'),
        profileTags: String(form.get('profileTags') ?? ''),
        socialLinks: Object.fromEntries(
          SOCIAL_PLATFORMS.map((platform) => [platform.key, form.get(`social_${platform.key}`)]),
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
      setOwnPosts((items) => items.filter((item) => item.id !== post.id));
      setPosts((items) => items.filter((item) => item.id !== post.id));
      setProfilePosts((items) => items.filter((item) => item.id !== post.id));
      setFollowingPosts((items) => items.filter((item) => item.id !== post.id));
      setBookmarkedPosts((items) => items.filter((item) => item.id !== post.id));
      setModal({ kind: 'none' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete post');
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

  const readFile = (
    file: File | undefined,
    limit: number,
    setter: (value: string) => void,
    input?: HTMLInputElement | null,
  ) => {
    if (!file) {
      if (input) input.value = '';
      setter('');
      return;
    }
    if (!isCommunityImageFile(file)) {
      setError(ja ? 'JPEG / PNG / WebP 画像を選択してください。' : 'Choose a JPEG, PNG, or WebP image.');
      if (input) input.value = '';
      return;
    }
    if (file.size > limit) {
      setError(
        ja ? `画像は${Math.round(limit / 1048576)}MB以下にしてください。` : 'Image is too large.',
      );
      if (input) input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setter(String(reader.result || ''));
      setError('');
      if (input) input.value = '';
    };
    reader.readAsDataURL(file);
  };

  const readPostFiles = (files?: FileList | File[] | null) => {
    const rawFiles = Array.from(files ?? []);
    if (!rawFiles.length) return;
    const selected = communityImageFiles(rawFiles).slice(0, 4);
    if (!selected.length) {
      setError(ja ? 'JPEG / PNG / WebP 画像を選択してください。' : 'Choose JPEG, PNG, or WebP images.');
      return;
    }
    if (selected.some((file) => file.size > 6 * 1048576)) {
      setError(ja ? '写真は1枚6MBまでです。' : 'Each photo must be 6MB or less.');
      return;
    }
    setError('');
    void Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ''));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    )
      .then((images) => setPostImages((current) => [...current, ...images].slice(0, 4)))
      .catch(() => setError(ja ? '写真を読み込めませんでした。' : 'Could not read photos.'));
  };

  const refreshCurrentPage = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError('');
    try {
      const refreshData = async () => {
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
            const [session, profile, refreshedPosts] = await Promise.all([
              communityApi.session(token),
              communityApi.user(profileUser.loginId, token),
              loadOwn(token),
            ]);
            const refreshedUser = await hydrateOwnProfileImages(
              mergeOwnProfile(session.user, profile.user),
              token,
            );
            setUser(refreshedUser);
            setProfileUser(refreshedUser);
            setProfilePosts(refreshedPosts);
          } else {
            await openProfile(profileUser.loginId);
          }
        } else {
          await loadFeed(token || undefined, true);
        }
      };
      await Promise.all([
        refreshData(),
        new Promise<void>((resolve) => window.setTimeout(resolve, 1000)),
      ]);
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

  const currentActions: CommunityActions = {
    closeDrawer,
    loadFeed,
    go,
    openProfile,
    openTag,
    openConnections,
    authenticate,
    logout,
    submitPost,
    saveProfile,
    removePost,
    toggleLike,
    toggleBookmark,
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
    readAvatar: (file) => readFile(file, 2 * 1048576, setAvatarImage),
    readHeader: (file) => readFile(file, 5 * 1048576, setHeaderImage),
    canDeletePost: (post) =>
      Boolean(
        user &&
          (post.authorLoginId?.toLocaleLowerCase() === user.loginId.toLocaleLowerCase() ||
            ownPosts.some((owned) => owned.id === post.id)),
      ),
  };
  const actionsRef = useRef<CommunityActions>(currentActions);
  actionsRef.current = currentActions;
  const actions = useMemo<CommunityActions>(
    () => ({
      closeDrawer: () => actionsRef.current.closeDrawer(),
      loadFeed: (...args) => actionsRef.current.loadFeed(...args),
      go: (...args) => actionsRef.current.go(...args),
      openProfile: (...args) => actionsRef.current.openProfile(...args),
      openTag: (...args) => actionsRef.current.openTag(...args),
      openConnections: (...args) => actionsRef.current.openConnections(...args),
      authenticate: (...args) => actionsRef.current.authenticate(...args),
      logout: () => actionsRef.current.logout(),
      submitPost: (...args) => actionsRef.current.submitPost(...args),
      saveProfile: (...args) => actionsRef.current.saveProfile(...args),
      removePost: (...args) => actionsRef.current.removePost(...args),
      toggleLike: (...args) => actionsRef.current.toggleLike(...args),
      toggleBookmark: (...args) => actionsRef.current.toggleBookmark(...args),
      toggleFollow: (...args) => actionsRef.current.toggleFollow(...args),
      refreshCurrentPage: () => actionsRef.current.refreshCurrentPage(),
      openLikes: (...args) => actionsRef.current.openLikes(...args),
      openProfileEditor: () => actionsRef.current.openProfileEditor(),
      closeModal: () => actionsRef.current.closeModal(),
      setAuthMode: (...args) => actionsRef.current.setAuthMode(...args),
      setModal: (...args) => actionsRef.current.setModal(...args),
      setQuery: (...args) => actionsRef.current.setQuery(...args),
      setTag: (...args) => actionsRef.current.setTag(...args),
      setPostImages: (...args) => actionsRef.current.setPostImages(...args),
      readPostFiles: (...args) => actionsRef.current.readPostFiles(...args),
      readAvatar: (...args) => actionsRef.current.readAvatar(...args),
      readHeader: (...args) => actionsRef.current.readHeader(...args),
      canDeletePost: (...args) => actionsRef.current.canDeletePost(...args),
    }),
    [],
  );

  return (
    <CommunityActionsContext.Provider value={actions}>
      <CommunityStateContext.Provider value={state}>{children}</CommunityStateContext.Provider>
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
