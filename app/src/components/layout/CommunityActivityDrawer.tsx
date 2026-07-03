import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { AppLanguage } from '../../i18n/messages';
import storage from '../../lib/storage';
import { SK } from '../../shared/constants';
import { communityApi } from '../../features/community/api';
import type {
  CommunityNotification,
  CommunityComment,
  CommunityPage,
  CommunityPost,
  CommunityUser,
  SocialLinks,
  SocialPlatform,
} from '../../features/community/types';
import '../../styles/community.css';

type Modal =
  | { kind: 'none' }
  | { kind: 'auth'; mode: 'login' | 'register' }
  | { kind: 'create' }
  | { kind: 'post'; post: CommunityPost }
  | { kind: 'profile' }
  | { kind: 'delete'; post: CommunityPost }
  | { kind: 'likes'; post: CommunityPost; users: CommunityUser[]; loading: boolean }
  | {
      kind: 'connections';
      relation: 'followers' | 'following';
      ownerName: string;
      users: CommunityUser[];
      loading: boolean;
    }
  | { kind: 'sent' };

const ALL_TAG = '__all__';
const TAG_CHARS = 'A-Za-z0-9_\\-\\u3040-\\u30ff\\u3400-\\u9fff\\uac00-\\ud7af';
const activeTagPattern = new RegExp(`(?:^|\\s)[#＃]([${TAG_CHARS}]*)$`, 'u');

function Glyph({
  name,
}: {
  name: 'home' | 'search' | 'plus' | 'user' | 'close' | 'image' | 'heart' | 'refresh' | 'bell';
}) {
  const paths = {
    home: (
      <>
        <path d="m4 11 8-7 8 7" />
        <path d="M6 10v10h12V10M9 20v-6h6v6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21c.5-4.2 2.8-6.3 7-6.3s6.5 2.1 7 6.3" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6 6 18" />,
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m4 17 5-5 4 4 2-2 5 4" />
      </>
    ),
    heart: (
      <path d="M20.4 5.6c-1.8-1.8-4.7-1.8-6.5 0L12 7.5l-1.9-1.9c-1.8-1.8-4.7-1.8-6.5 0s-1.8 4.7 0 6.5L12 20.5l8.4-8.4c1.8-1.8 1.8-4.7 0-6.5Z" />
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M18.2 16a8 8 0 1 1 .8-7.1L20 12" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {paths[name]}
    </svg>
  );
}

export function CommunityActivityDrawer({
  language,
  defaultAuthorName,
  onClose,
}: {
  language: AppLanguage;
  defaultAuthorName: string;
  onClose: () => void;
}) {
  const ja = language === 'ja';
  const [page, setPage] = useState<CommunityPage>('home');
  const [modal, setModal] = useState<Modal>({ kind: 'none' });
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [ownPosts, setOwnPosts] = useState<CommunityPost[]>([]);
  const [followingPosts, setFollowingPosts] = useState<CommunityPost[]>([]);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [searchUsers, setSearchUsers] = useState<CommunityUser[]>([]);
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileUser, setProfileUser] = useState<CommunityUser | null>(null);
  const [profilePosts, setProfilePosts] = useState<CommunityPost[]>([]);
  const [user, setUser] = useState<CommunityUser | null>(null);
  const [token, setToken] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState(ALL_TAG);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [avatarImage, setAvatarImage] = useState('');
  const [headerImage, setHeaderImage] = useState('');
  const [closing, setClosing] = useState(false);
  const objectUrls = useRef<string[]>([]);
  const profileObjectUrls = useRef<string[]>([]);
  const closeTimer = useRef<number | null>(null);

  const closeDrawer = useCallback(() => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 360);
  }, [closing, onClose]);

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
    [ja],
  );

  const loadOwn = useCallback(async (authToken: string) => {
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
  }, []);

  const loadFollowing = useCallback(async (authToken: string) => {
    try {
      setFollowingPosts((await communityApi.followingPosts(authToken)).posts);
    } catch {
      setFollowingPosts([]);
    }
  }, []);

  const hydrateOwnProfileImages = useCallback(async (source: CommunityUser, authToken: string) => {
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
  }, []);

  const loadNotifications = useCallback(async (authToken: string) => {
    try {
      const result = await communityApi.notifications(authToken);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch {
      setNotifications([]);
    }
  }, []);

  const loadKnownTags = useCallback(async () => {
    try {
      setKnownTags((await communityApi.tags()).tags);
    } catch {
      setKnownTags([]);
    }
  }, []);

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
        const hydratedUser = await hydrateOwnProfileImages(result.user, authToken);
        setToken(authToken);
        setUser(hydratedUser);
        setProfileUser(hydratedUser);
        void loadFeed(authToken);
        void loadOwn(authToken);
        void loadFollowing(authToken);
        void loadNotifications(authToken);
      } catch {
        await storage.set({ [SK.communityAuthToken]: '' });
      }
    })();
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      objectUrls.current.forEach(URL.revokeObjectURL);
      profileObjectUrls.current.forEach(URL.revokeObjectURL);
    };
  }, [hydrateOwnProfileImages, loadFeed, loadFollowing, loadKnownTags, loadNotifications, loadOwn]);

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
  }, [page, query, token]);

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
  }, [busy, closeDrawer, modal.kind]);

  const visiblePosts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return posts.filter(
      (post) =>
        (tag === ALL_TAG || post.tags.includes(tag)) &&
        (!needle ||
          `${post.title} ${post.caption} ${post.authorName} ${post.authorLoginId} ${post.tags.join(' ')}`
            .toLocaleLowerCase()
            .includes(needle)),
    );
  }, [posts, query, tag]);

  const followingTags = useMemo(() => {
    const seen = new Set<string>();
    for (const post of followingPosts) for (const item of post.tags) if (item) seen.add(item);
    return [ALL_TAG, ...Array.from(seen).sort((a, b) => a.localeCompare(b, ja ? 'ja' : 'en'))];
  }, [followingPosts, ja]);

  const visibleFollowingPosts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return followingPosts.filter(
      (post) =>
        (tag === ALL_TAG || post.tags.includes(tag)) &&
        (!needle ||
          `${post.title} ${post.caption} ${post.authorName} ${post.authorLoginId} ${post.tags.join(' ')}`
            .toLocaleLowerCase()
            .includes(needle)),
    );
  }, [followingPosts, query, tag]);

  const tags = useMemo(() => {
    const seen = new Set<string>();
    for (const post of posts) {
      for (const item of post.tags) {
        if (item) seen.add(item);
      }
    }
    for (const item of knownTags) if (item) seen.add(item);
    return [ALL_TAG, ...Array.from(seen).sort((a, b) => a.localeCompare(b, ja ? 'ja' : 'en'))];
  }, [ja, knownTags, posts]);

  const go = (next: CommunityPage) => {
    if (next === 'following' && !user) {
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
      const hydratedUser = await hydrateOwnProfileImages(result.user, result.token);
      setToken(result.token);
      setUser(hydratedUser);
      setProfileUser(hydratedUser);
      setModal({ kind: 'none' });
      void loadFeed(result.token);
      void loadOwn(result.token);
      void loadFollowing(result.token);
      void loadNotifications(result.token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (token) void communityApi.logout(token).catch(() => undefined);
    await storage.set({ [SK.communityAuthToken]: '' });
    objectUrls.current.forEach(URL.revokeObjectURL);
    objectUrls.current = [];
    profileObjectUrls.current.forEach(URL.revokeObjectURL);
    profileObjectUrls.current = [];
    setToken('');
    setUser(null);
    setOwnPosts([]);
    setFollowingPosts([]);
    setNotifications([]);
    setUnreadCount(0);
    setProfileUser(null);
    setProfilePosts([]);
    setPage('home');
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
      ...post,
      likedByMe: !post.likedByMe,
      likeCount: Math.max(0, post.likeCount + (post.likedByMe ? -1 : 1)),
    };
    const apply = (items: CommunityPost[]) =>
      items.map((item) => (item.id === post.id ? { ...item, ...next } : item));
    setPosts(apply);
    setOwnPosts(apply);
    setProfilePosts(apply);
    setFollowingPosts(apply);
    setModal((current) =>
      current.kind === 'post' && current.post.id === post.id
        ? { kind: 'post', post: { ...current.post, ...next } }
        : current,
    );
    try {
      const result = post.likedByMe
        ? await communityApi.unlikePost(token, post.id)
        : await communityApi.likePost(token, post.id);
      const confirmed = { likedByMe: result.likedByMe, likeCount: result.likeCount };
      setPosts((items) =>
        items.map((item) => (item.id === post.id ? { ...item, ...confirmed } : item)),
      );
      setOwnPosts((items) =>
        items.map((item) => (item.id === post.id ? { ...item, ...confirmed } : item)),
      );
      setProfilePosts((items) =>
        items.map((item) => (item.id === post.id ? { ...item, ...confirmed } : item)),
      );
      setFollowingPosts((items) =>
        items.map((item) => (item.id === post.id ? { ...item, ...confirmed } : item)),
      );
      setModal((current) =>
        current.kind === 'post' && current.post.id === post.id
          ? { kind: 'post', post: { ...current.post, ...confirmed } }
          : current,
      );
    } catch (cause) {
      setPosts((items) => items.map((item) => (item.id === post.id ? { ...item, ...post } : item)));
      setOwnPosts((items) =>
        items.map((item) => (item.id === post.id ? { ...item, ...post } : item)),
      );
      setProfilePosts((items) =>
        items.map((item) => (item.id === post.id ? { ...item, ...post } : item)),
      );
      setFollowingPosts((items) =>
        items.map((item) => (item.id === post.id ? { ...item, ...post } : item)),
      );
      setModal((current) =>
        current.kind === 'post' && current.post.id === post.id
          ? { kind: 'post', post: { ...current.post, ...post } }
          : current,
      );
      setError(cause instanceof Error ? cause.message : 'Could not update like');
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

  const readPostFiles = (files?: FileList | null) => {
    const selected = Array.from(files ?? []).slice(0, 4);
    if (!selected.length) return;
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

  const pageTitle =
    page === 'home'
      ? ja
        ? 'ホーム'
        : 'Home'
      : page === 'explore'
        ? ja
          ? '見つける'
          : 'Explore'
        : page === 'following'
          ? ja
            ? 'フォロー中'
            : 'Following'
          : page === 'notifications'
            ? ja
              ? '通知'
              : 'Notifications'
            : ja
              ? 'プロフィール'
              : 'Profile';

  return (
    <div className={`community-root${closing ? ' is-closing' : ''}`}>
      <button
        className="community-gutter"
        type="button"
        onClick={closeDrawer}
        aria-label={ja ? '閉じる' : 'Close'}
      />
      <section
        className="community-app"
        role="dialog"
        aria-modal="true"
        aria-label={ja ? 'みんなの活動' : 'Community'}
      >
        <Sidebar
          page={page}
          user={user}
          ja={ja}
          unreadCount={unreadCount}
          go={go}
          onLogin={() => setModal({ kind: 'auth', mode: 'login' })}
        />
        <div className="community-main">
          <header className="community-topbar">
            <div>
              <strong>{pageTitle}</strong>
              <small>CAMPUS COMMUNITY</small>
            </div>
            <button
              className={`community-refresh${refreshing ? ' is-refreshing' : ''}`}
              type="button"
              onClick={() => void refreshCurrentPage()}
              disabled={refreshing}
              aria-label={ja ? '画面を更新' : 'Refresh'}
              title={ja ? '更新' : 'Refresh'}
            >
              {refreshing ? <Busy /> : <Glyph name="refresh" />}
              <span>
                {refreshing ? (ja ? '更新中' : 'Refreshing') : ja ? '更新' : 'Refresh'}
              </span>
            </button>
            {!user ? (
              <div className="community-auth-actions">
                <button onClick={() => setModal({ kind: 'auth', mode: 'register' })}>
                  {ja ? '新規登録' : 'Sign up'}
                </button>
                <button
                  className="is-primary"
                  onClick={() => setModal({ kind: 'auth', mode: 'login' })}
                >
                  {ja ? 'ログイン' : 'Log in'}
                </button>
              </div>
            ) : (
              <button className="community-logout" onClick={() => void logout()}>
                {ja ? 'ログアウト' : 'Log out'}
              </button>
            )}
            <button
              className="community-close"
              type="button"
              onClick={closeDrawer}
              aria-label={ja ? '閉じる' : 'Close'}
            >
              <Glyph name="close" />
            </button>
          </header>
          {page === 'home' ? (
            <HomeScreen
              posts={posts}
              loading={loading}
              error={error}
              ja={ja}
              onRetry={loadFeed}
              onCreate={() => go('create')}
              onExplore={() => go('explore')}
              onOpen={(post) => setModal({ kind: 'post', post })}
              onLike={(post) => void toggleLike(post)}
            />
          ) : null}
          {page === 'explore' ? (
            <ExploreScreen
              posts={visiblePosts}
              loading={loading}
              query={query}
              tag={tag}
              tags={tags}
              users={searchUsers}
              ja={ja}
              setQuery={setQuery}
              setTag={setTag}
              onOpenProfile={(loginId) => void openProfile(loginId)}
              onOpen={(post) => setModal({ kind: 'post', post })}
              onLike={(post) => void toggleLike(post)}
            />
          ) : null}
          {page === 'following' ? (
            <ExploreScreen
              posts={visibleFollowingPosts}
              loading={loading}
              query={query}
              tag={tag}
              tags={followingTags}
              users={[]}
              ja={ja}
              setQuery={setQuery}
              setTag={setTag}
              onOpenProfile={(loginId) => void openProfile(loginId)}
              onOpen={(post) => setModal({ kind: 'post', post })}
              onLike={(post) => void toggleLike(post)}
              title={ja ? 'フォロー中' : 'Following'}
              description={
                ja
                  ? 'フォローしているユーザーの投稿だけを表示します。'
                  : 'Posts from people you follow.'
              }
            />
          ) : null}
          {page === 'notifications' ? (
            <NotificationsScreen
              notifications={notifications}
              ja={ja}
              onOpenProfile={(loginId) => void openProfile(loginId)}
            />
          ) : null}
          {page === 'profile' && profileUser ? (
            <ProfileScreen
              user={profileUser}
              viewer={user}
              posts={profilePosts}
              ja={ja}
              isOwn={Boolean(user && profileUser.loginId === user.loginId)}
              onEdit={() => {
                setAvatarImage('');
                setHeaderImage('');
                setModal({ kind: 'profile' });
              }}
              onCreate={() => go('create')}
              onOpen={(post) => setModal({ kind: 'post', post })}
              onLike={(post) => void toggleLike(post)}
              onFollow={() => void toggleFollow(profileUser)}
              onConnections={(relation) => void openConnections(profileUser, relation)}
              onTagClick={openTag}
            />
          ) : null}
        </div>
        <MobileNav
          page={page}
          user={user}
          ja={ja}
          unreadCount={unreadCount}
          go={go}
          onLogin={() => setModal({ kind: 'auth', mode: 'login' })}
        />
        <ModalLayer
          modal={modal}
          token={token}
          user={user}
          ja={ja}
          busy={busy}
          error={error}
          defaultAuthorName={defaultAuthorName}
          postImages={postImages}
          updatePostImages={setPostImages}
          avatarImage={avatarImage}
          headerImage={headerImage}
          suggestedTags={tags.filter((item) => item !== ALL_TAG)}
          close={() => {
            if (!busy) {
              setError('');
              setModal({ kind: 'none' });
            }
          }}
          toggleLike={(post) => void toggleLike(post)}
          setAuthMode={(mode) => {
            setError('');
            setModal({ kind: 'auth', mode });
          }}
          authenticate={authenticate}
          submitPost={submitPost}
          saveProfile={saveProfile}
          removePost={removePost}
          requestDelete={(post) => setModal({ kind: 'delete', post })}
          openLikes={(post) => {
            setModal({ kind: 'likes', post, users: [], loading: true });
            void communityApi
              .postLikes(post.id, token || undefined)
              .then((result) =>
                setModal((current) =>
                  current.kind === 'likes'
                    ? { ...current, users: result.users, loading: false }
                    : current,
                ),
              )
              .catch(() =>
                setModal((current) =>
                  current.kind === 'likes' ? { ...current, loading: false } : current,
                ),
              );
          }}
          canDeletePost={(post) =>
            Boolean(
              user &&
                (post.authorLoginId?.toLocaleLowerCase() === user.loginId.toLocaleLowerCase() ||
                  ownPosts.some((owned) => owned.id === post.id)),
            )
          }
          openTag={openTag}
          openProfile={(loginId) => void openProfile(loginId)}
          readPost={readPostFiles}
          readAvatar={(file) => readFile(file, 2 * 1048576, setAvatarImage)}
          readHeader={(file) => readFile(file, 5 * 1048576, setHeaderImage)}
        />
      </section>
    </div>
  );
}

function Sidebar({
  page,
  user,
  ja,
  unreadCount,
  go,
  onLogin,
}: {
  page: CommunityPage;
  user: CommunityUser | null;
  ja: boolean;
  unreadCount: number;
  go: (page: CommunityPage) => void;
  onLogin: () => void;
}) {
  return (
    <aside className="community-sidebar">
      <button className="community-brand" onClick={() => go('home')}>
        <img src={browser.runtime.getURL('community/activity-icon.png' as never)} alt="" />
        <strong>{ja ? 'みんなの活動' : 'Community'}</strong>
      </button>
      <nav>
        <NavButton
          active={page === 'home'}
          icon="home"
          label={ja ? 'ホーム' : 'Home'}
          onClick={() => go('home')}
        />
        <NavButton
          active={page === 'explore'}
          icon="search"
          label={ja ? '見つける' : 'Explore'}
          onClick={() => go('explore')}
        />
        <NavButton
          active={page === 'following'}
          icon="heart"
          label={ja ? 'フォロー中' : 'Following'}
          onClick={() => go('following')}
        />
        <NavButton
          active={page === 'notifications'}
          icon="bell"
          label={ja ? '通知' : 'Notifications'}
          badge={user ? unreadCount : undefined}
          onClick={() => go('notifications')}
        />
        <NavButton
          active={page === 'profile'}
          icon="user"
          label={ja ? 'プロフィール' : 'Profile'}
          onClick={() => go('profile')}
        />
      </nav>
      <button className="community-create" onClick={() => go('create')}>
        <Glyph name="plus" />
        {ja ? '新しい投稿' : 'New post'}
      </button>
      <div className="community-account">
        {user ? (
          <button className="community-account-user" type="button" onClick={() => go('profile')}>
            <Avatar user={user} />
            <span>
              <strong>{user.displayName}</strong>
              <em>@{user.loginId}</em>
            </span>
          </button>
        ) : (
          <>
            <p>{ja ? '投稿するにはログインが必要です。' : 'Log in to create posts.'}</p>
            <button onClick={onLogin}>{ja ? 'ログイン' : 'Log in'}</button>
          </>
        )}
      </div>
    </aside>
  );
}

function NavButton({
  active,
  icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: 'home' | 'search' | 'user' | 'heart' | 'bell';
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button className={active ? 'is-active' : ''} onClick={onClick}>
      <Glyph name={icon} />
      <span>{label}</span>
      {badge ? <b className="community-nav-badge">{badge > 99 ? '99+' : badge}</b> : null}
    </button>
  );
}

function MobileNav({
  page,
  user,
  ja,
  unreadCount,
  go,
  onLogin,
}: {
  page: CommunityPage;
  user: CommunityUser | null;
  ja: boolean;
  unreadCount: number;
  go: (page: CommunityPage) => void;
  onLogin: () => void;
}) {
  return (
    <nav className="community-mobile-nav">
      <NavButton
        active={page === 'home'}
        icon="home"
        label={ja ? 'ホーム' : 'Home'}
        onClick={() => go('home')}
      />
      <NavButton
        active={page === 'explore'}
        icon="search"
        label={ja ? '見つける' : 'Explore'}
        onClick={() => go('explore')}
      />
      <NavButton
        active={page === 'following'}
        icon="heart"
        label={ja ? 'フォロー' : 'Following'}
        onClick={() => go('following')}
      />
      <NavButton
        active={page === 'notifications'}
        icon="bell"
        label={ja ? '通知' : 'Notifications'}
        badge={user ? unreadCount : undefined}
        onClick={() => go('notifications')}
      />
      <button onClick={() => go('create')}>
        <Glyph name="plus" />
        <span>{ja ? '投稿' : 'Post'}</span>
      </button>
      <NavButton
        active={page === 'profile'}
        icon="user"
        label={user ? (ja ? '自分' : 'Profile') : ja ? 'ログイン' : 'Log in'}
        onClick={user ? () => go('profile') : onLogin}
      />
    </nav>
  );
}

function HomeScreen({
  posts,
  loading,
  error,
  ja,
  onRetry,
  onCreate,
  onExplore,
  onOpen,
  onLike,
}: {
  posts: CommunityPost[];
  loading: boolean;
  error: string;
  ja: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onExplore: () => void;
  onOpen: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
}) {
  return (
    <main className="community-scroll">
      <div className="community-content">
        <header className="community-screen-heading community-home-heading">
          <div>
            <h1>{ja ? 'みんなの活動' : 'Campus Community'}</h1>
            <p>
              {ja
                ? '作品やイベント、クラブ活動など、キャンパスのみんなが共有した投稿です。'
                : 'Student work, events, clubs and everyday moments from around campus.'}
            </p>
          </div>
          <button onClick={onCreate}>
            <Glyph name="plus" />
            {ja ? '投稿する' : 'Create post'}
          </button>
        </header>
        {error ? (
          <div className="community-error">
            <span>{error}</span>
            <button onClick={onRetry}>{ja ? '再読み込み' : 'Retry'}</button>
          </div>
        ) : null}
        {loading ? (
          <Empty ja={ja} loading />
        ) : posts.length ? (
          <section className="community-feed-panel">
            <header className="community-section-heading">
              <div>
                <small>LATEST</small>
                <h2>{ja ? '新着の活動' : 'Latest activities'}</h2>
              </div>
              <button onClick={onExplore}>{ja ? 'すべて見る' : 'View all'}</button>
            </header>
            <div className="community-grid is-home">
              {posts.slice(0, 9).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  ja={ja}
                  onOpen={() => onOpen(post)}
                  onLike={() => onLike(post)}
                />
              ))}
            </div>
            {posts.length > 9 ? (
              <button className="community-more" onClick={onExplore}>
                {ja ? 'すべての投稿を見る' : 'View all posts'}
              </button>
            ) : null}
          </section>
        ) : (
          <Empty ja={ja} action={onCreate} />
        )}
      </div>
    </main>
  );
}

function ExploreScreen({
  posts,
  users,
  loading,
  query,
  tag,
  tags,
  ja,
  title,
  description,
  setQuery,
  setTag,
  onOpenProfile,
  onOpen,
  onLike,
}: {
  posts: CommunityPost[];
  users: CommunityUser[];
  loading: boolean;
  query: string;
  tag: string;
  tags: string[];
  ja: boolean;
  title?: string;
  description?: string;
  setQuery: (value: string) => void;
  setTag: (value: string) => void;
  onOpenProfile: (loginId: string) => void;
  onOpen: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
}) {
  return (
    <main className="community-scroll">
      <div className="community-content">
        <header className="community-screen-heading">
          <div>
            <h1>{title || (ja ? '見つける' : 'Explore')}</h1>
            <p>
              {description ||
                (ja
                  ? 'キーワードや本文のハッシュタグから活動を探せます。'
                  : 'Find activities by keyword or hashtag.')}
            </p>
          </div>
        </header>
        <label className="community-search">
          <Glyph name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ja ? '投稿・アカウントを検索' : 'Search posts and accounts'}
          />
        </label>
        <div className="community-chips">
          {tags.map((item) => (
            <button
              className={tag === item ? 'is-active' : ''}
              key={item}
              onClick={() => setTag(item)}
            >
              {item === ALL_TAG ? (ja ? 'すべて' : 'All') : `#${item}`}
            </button>
          ))}
        </div>
        <div className="community-result">
          <strong>{ja ? '投稿' : 'Posts'}</strong>
          <span>{loading ? '—' : `${posts.length}${ja ? '件' : ''}`}</span>
        </div>
        {users.length ? (
          <section className="community-account-results">
            <header>
              <strong>{ja ? 'アカウント' : 'Accounts'}</strong>
              <span>{users.length}{ja ? '件' : ''}</span>
            </header>
            <div>
              {users.map((item) => (
                <button type="button" key={item.id} onClick={() => onOpenProfile(item.loginId)}>
                  <Avatar user={item} />
                  <span>
                    <strong>{item.displayName}</strong>
                    <small>@{item.loginId}</small>
                    {(item.profileTags ?? []).length ? (
                      <em>{item.profileTags.map((profileTag) => `#${profileTag}`).join(' ')}</em>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {loading ? (
          <Empty ja={ja} loading />
        ) : posts.length ? (
          <div className="community-grid">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                ja={ja}
                onOpen={() => onOpen(post)}
                onLike={() => onLike(post)}
              />
            ))}
          </div>
        ) : (
          <Empty ja={ja} />
        )}
      </div>
    </main>
  );
}

function PostCard({
  post,
  ja,
  onOpen,
  onLike,
}: {
  post: CommunityPost;
  ja: boolean;
  onOpen: () => void;
  onLike: () => void;
}) {
  const like = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onLike();
  };
  const visibleTags = post.tags.slice(0, 3);
  const postedAt = new Date(post.createdAt);
  const postedLabel = Number.isNaN(postedAt.getTime())
    ? ''
    : postedAt.toLocaleDateString(ja ? 'ja-JP' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
  return (
    <article
      className="community-post"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen();
      }}
    >
      <div className="community-post-media">
        <img src={post.previewUrl || post.imageUrl} alt="" loading="lazy" />
        {(post.imageUrls?.length ?? 1) > 1 ? (
          <span className="community-post-image-count">▣ {post.imageUrls?.length}</span>
        ) : null}
      </div>
      <div className="community-post-card-body">
        <div className="community-post-card-title">
          <h2>{post.title}</h2>
          {postedLabel ? <time>{postedLabel}</time> : null}
        </div>
        <p>{post.caption}</p>
        <footer>
          <div className="community-post-card-author">
            <Avatar name={post.authorName} url={post.authorAvatarUrl} />
            <strong>{post.authorName}</strong>
          </div>
          {visibleTags.length ? (
            <div className="community-post-tags">
              {visibleTags.map((item) => (
                <span key={item}>#{item}</span>
              ))}
            </div>
          ) : null}
          <button
            className={`community-like${post.likedByMe ? ' is-active' : ''}`}
            type="button"
            onClick={like}
            aria-label="いいね"
          >
            <Glyph name="heart" />
            <span>{post.likeCount}</span>
          </button>
        </footer>
      </div>
    </article>
  );
}

function NotificationsScreen({
  notifications,
  ja,
  onOpenProfile,
}: {
  notifications: CommunityNotification[];
  ja: boolean;
  onOpenProfile: (loginId: string) => void;
}) {
  const notificationText = (item: CommunityNotification) => {
    if (item.type === 'like') return ja ? `が「${item.post?.title ?? '投稿'}」にいいねしました` : `liked “${item.post?.title ?? 'your post'}”`;
    if (item.type === 'follow') return ja ? 'があなたをフォローしました' : 'followed you';
    if (item.type === 'post_approved') return ja ? `「${item.post?.title ?? '投稿'}」が承認されました` : `Your post was approved`;
    if (item.type === 'post_rejected') return ja ? `「${item.post?.title ?? '投稿'}」が却下されました` : `Your post was rejected`;
    if (item.type === 'comment_approved') return ja ? 'コメントが承認されました' : 'Your comment was approved';
    if (item.type === 'comment_rejected') return ja ? 'コメントが却下されました' : 'Your comment was rejected';
    if (item.type === 'profile_approved') return ja ? 'プロフィール変更が承認されました' : 'Your profile update was approved';
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

function Empty({ ja, loading, action }: { ja: boolean; loading?: boolean; action?: () => void }) {
  return (
    <div className="community-empty">
      <span>
        <Glyph name="image" />
      </span>
      <h2>
        {loading
          ? ja
            ? '読み込んでいます'
            : 'Loading'
          : ja
            ? '投稿はまだありません'
            : 'No posts yet'}
      </h2>
      {!loading ? (
        <p>{ja ? '最初の活動を共有してみませんか。' : 'Share the first campus activity.'}</p>
      ) : null}
      {action ? <button onClick={action}>{ja ? '投稿を作る' : 'Create post'}</button> : null}
    </div>
  );
}

function ProfileScreen({
  user,
  viewer,
  posts,
  ja,
  isOwn,
  onEdit,
  onCreate,
  onOpen,
  onLike,
  onFollow,
  onConnections,
  onTagClick,
}: {
  user: CommunityUser;
  viewer: CommunityUser | null;
  posts: CommunityPost[];
  ja: boolean;
  isOwn: boolean;
  onEdit: () => void;
  onCreate: () => void;
  onOpen: (post: CommunityPost) => void;
  onLike: (post: CommunityPost) => void;
  onFollow: () => void;
  onConnections: (relation: 'followers' | 'following') => void;
  onTagClick: (tag: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const shown = !isOwn || filter === 'all' ? posts : posts.filter((post) => post.status === filter);
  return (
    <main className="community-scroll">
      <div className="community-content">
        <section className="community-profile">
          <div className="community-profile-banner">
            {user.headerUrl ? (
              <img
                src={user.headerUrl}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : null}
          </div>
          <div className="community-profile-info">
            <Avatar user={user} large />
            <div className="community-profile-copy">
              <div className="community-profile-identity">
                <h1>{user.displayName}</h1>
                <span>@{user.loginId}</span>
              </div>
              <p className="community-profile-bio">
                {user.bio || (ja ? '自己紹介はまだありません。' : 'No bio yet.')}
              </p>
              {user.academicGroup && user.department ? (
                <section className="community-profile-academic">
                  <span>{ja ? '所属' : 'Program'}</span>
                  <div>
                    <strong>{user.academicGroup}</strong>
                    <small>{user.department}</small>
                  </div>
                </section>
              ) : null}
              {(user.profileTags ?? []).length ? (
                <section className="community-profile-tag-section">
                  <span>{ja ? 'プロフィールタグ' : 'Profile tags'}</span>
                  <div className="community-profile-tags" aria-label={ja ? 'プロフィールタグ' : 'Profile tags'}>
                    {(user.profileTags ?? []).map((tag) => (
                      <button type="button" key={tag} onClick={() => onTagClick(tag)}>
                        #{tag}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              {user.websiteUrl || socialEntries(user.socialLinks).length ? (
                <section className="community-profile-link-section">
                  <span>{ja ? 'リンク' : 'Links'}</span>
                  <div>
                    {user.websiteUrl ? (
                      <a
                        className="community-profile-link"
                        href={user.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span aria-hidden="true">↗</span>
                        {websiteLabel(user.websiteUrl)}
                      </a>
                    ) : null}
                    {socialEntries(user.socialLinks).length ? (
                      <div
                        className="community-profile-socials"
                        aria-label={ja ? '外部リンク' : 'Social links'}
                      >
                        {socialEntries(user.socialLinks).map((entry) => (
                          <a key={entry.key} href={entry.url} target="_blank" rel="noopener noreferrer">
                            <SocialIcon platform={entry.key} />
                            <span>{entry.label}</span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}
              <div className="community-profile-stats">
                <span>
                  <strong>{posts.length}</strong>
                  {ja ? '投稿' : 'Posts'}
                </span>
                <span>
                  <strong>
                    {isOwn
                      ? posts.filter((post) => post.status === 'approved').length
                      : posts.length}
                  </strong>
                  {ja ? '公開中' : 'Published'}
                </span>
                {isOwn ? (
                  <span>
                    <strong>{posts.filter((post) => post.status === 'pending').length}</strong>
                    {ja ? '審査中' : 'Pending'}
                  </span>
                ) : null}
                <button type="button" onClick={() => onConnections('followers')}>
                  <strong>{user.followerCount ?? 0}</strong>
                  {ja ? 'フォロワー' : 'Followers'}
                </button>
                <button type="button" onClick={() => onConnections('following')}>
                  <strong>{user.followingCount ?? 0}</strong>
                  {ja ? 'フォロー中' : 'Following'}
                </button>
              </div>
            </div>
            <div className="community-profile-actions">
              {isOwn ? (
                <button onClick={onEdit}>{ja ? '編集' : 'Edit'}</button>
              ) : viewer ? (
                <button className={user.followedByMe ? 'is-following' : ''} onClick={onFollow}>
                  {user.followedByMe
                    ? ja
                      ? 'フォロー中'
                      : 'Following'
                    : ja
                      ? 'フォロー'
                      : 'Follow'}
                </button>
              ) : (
                <button onClick={onFollow}>
                  {ja ? 'ログインしてフォロー' : 'Log in to follow'}
                </button>
              )}
            </div>
          </div>
          {isOwn && user.profileState === 'editing' ? (
            <div className="community-notice">
              {ja ? 'プロフィールの変更を審査中です。' : 'Profile changes are under review.'}
            </div>
          ) : null}
        </section>
        {isOwn ? (
          <nav className="community-profile-tabs">
            {(['all', 'approved', 'pending', 'rejected'] as const).map((item) => (
              <button
                className={filter === item ? 'is-active' : ''}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item === 'all'
                  ? ja
                    ? 'すべて'
                    : 'All'
                  : item === 'approved'
                    ? ja
                      ? '公開中'
                      : 'Published'
                    : item === 'pending'
                      ? ja
                        ? '審査中'
                        : 'Pending'
                      : ja
                        ? '非公開'
                        : 'Rejected'}
              </button>
            ))}
          </nav>
        ) : null}
        {shown.length ? (
          <div className="community-grid">
            {shown.map((post) => (
              <div className="community-own-post" key={post.id}>
                <PostCard
                  post={post}
                  ja={ja}
                  onOpen={() => onOpen(post)}
                  onLike={() => onLike(post)}
                />
                <span className={`is-${post.status}`}>
                  {post.status === 'approved'
                    ? ja
                      ? '公開中'
                      : 'Published'
                    : post.status === 'pending'
                      ? ja
                        ? '審査中'
                        : 'Pending'
                      : ja
                        ? '非公開'
                        : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty ja={ja} action={onCreate} />
        )}
      </div>
    </main>
  );
}

function websiteLabel(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return value;
  }
}

const ACADEMIC_GROUPS: Record<string, string[]> = {
  'アート・デザイン学系': ['芸術情報学科', 'アート・デザイン学科', 'マンガ・アニメ学科', 'アート・デザイン基礎科'],
  'ビジネス学系': ['経営情報学科', '応用情報学科', '情報ビジネス科', 'IT医療事務科'],
  'コンピュータサイエンス学系': ['情報科学科', 'メディア情報学科', 'ネットワーク学科', '情報処理科'],
  'デジタルゲーム学系': ['ゲーム学科', 'ゲーム開発学科', 'ゲーム開発基礎科'],
  'エンジニアリング学系': ['情報工学科', 'コンピュータ工学科', 'コンピュータ工学基礎科'],
};

const SOCIAL_PLATFORMS: Array<{ key: SocialPlatform; label: string; placeholder: string }> = [
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
  { key: 'x', label: 'X', placeholder: 'https://x.com/username' },
  { key: 'pixiv', label: 'Pixiv', placeholder: 'https://www.pixiv.net/users/123456' },
  { key: 'zenn', label: 'Zenn', placeholder: 'https://zenn.dev/username' },
  { key: 'qiita', label: 'Qiita', placeholder: 'https://qiita.com/username' },
  { key: 'hatena', label: 'Hatena', placeholder: 'https://username.hatenablog.com' },
  { key: 'unityroom', label: 'UnityRoom', placeholder: 'https://unityroom.com/users/username' },
];

function socialEntries(links: SocialLinks | null | undefined) {
  return SOCIAL_PLATFORMS.flatMap((platform) => {
    const url = links?.[platform.key];
    return url ? [{ ...platform, url }] : [];
  });
}

const SOCIAL_ICON_PATHS: Record<Exclude<SocialPlatform, 'unityroom'>, string> = {
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  x: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
  pixiv:
    'M4.94 0A4.953 4.953 0 0 0 0 4.94v14.12A4.953 4.953 0 0 0 4.94 24h14.12A4.953 4.953 0 0 0 24 19.06c-.014 1.355 0-14.12 0-14.12A4.953 4.953 0 0 0 19.06 0Zm1.783 5.465h.904a.37.37 0 0 1 .31.17l.752 1.17a6.172 6.172 0 0 1 10.01 4.834 6.172 6.172 0 0 1-9.394 5.265v2.016a.37.37 0 0 1-.37.367H6.724a.37.37 0 0 1-.37-.367V5.834a.37.37 0 0 1 .37-.37m5.804 2.951a3.222 3.222 0 1 0-.002 6.443 3.222 3.222 0 0 0 .002-6.443',
  zenn: 'M.264 23.771h4.984c.264 0 .498-.147.645-.352L19.614.874c.176-.293-.029-.645-.381-.645h-4.72c-.235 0-.44.117-.557.323L.03 23.361c-.088.176.029.41.234.41zM17.445 23.419l6.479-10.408c.205-.323-.029-.733-.41-.733h-4.691c-.176 0-.352.088-.44.235l-6.655 10.643c-.176.264.029.616.352.616h4.779c.234-.001.468-.118.586-.353z',
  qiita:
    'M12 0C5.3726 0 0 5.3726 0 12s5.3726 12 12 12c3.3984 0 6.4665-1.413 8.6498-3.6832-.383-.0574-.7746-.2062-1.1466-.4542-.7145-.4763-1.3486-.9263-1.6817-1.674-1.2945 1.3807-3.0532 1.835-5.1822 2.0503-4.311.4359-8.0456-1.4893-8.4979-6.2996-.1922-2.045.2628-3.989 1.1804-5.582l-.5342-2.1009c-.0862-.3652.2498-.7126.6057-.6262l1.8456.448c1.0974-.9012 2.4249-1.49 3.8892-1.638 1.2526-.1267 2.467.0834 3.571.5624l1.7348-1.0494c.3265-.1974.7399.0257.7711.4164l.1 2.4747c1.334 1.4086 2.2424 3.3321 2.4478 5.5162.116 1.2339-.012 2.1776-.339 3.078-.1531.4215-.1992.7778.0776 1.1305.2674.3408.6915 1.0026 1.1644.8917.7107-.1666 1.4718-.1223 1.9422.1715C23.4925 15.9525 24 14.0358 24 12 24 5.3726 18.6274 0 12 0Zm-.0727 5.727a5.2731 5.2731 0 0 0-.6146.0273c-2.2084.2233-3.9572 1.8135-4.4937 3.8484l-1.3176-.1996-.014.2589 1.2972.1407c-.0352.1497-.0643.2384-.086.3923l-1.1319.0902.0103.2025 1.1032-.088c-.0194.1713-.031.2814-.0332.4565l-1.0078.412.0495.2499.9598-.4492c.002.1339.008.2053.0207.3407.2667 2.8371 2.6364 3.3981 5.4677 3.1118 2.8312-.2863 5.0517-1.3114 4.785-4.1486-.013-.1361-.0324-.2068-.0553-.3392l1.0397.2257.0242-.229-1.0906-.207c-.0342-.1687-.0765-.271-.1264-.4327l1.1208-.1374-.0158-.2019-1.1499.1409a5.1093 5.1093 0 0 0-.1665-.4259l1.2665-.4042-.0397-.2536-1.3471.4667c-.819-1.7168-2.5002-2.8224-4.4546-2.8482Z',
  hatena:
    'M20.47 0C22.42 0 24 1.58 24 3.53v16.94c0 1.95-1.58 3.53-3.53 3.53H3.53C1.58 24 0 22.42 0 20.47V3.53C0 1.58 1.58 0 3.53 0h16.94zm-3.705 14.47c-.78 0-1.41.63-1.41 1.41s.63 1.414 1.41 1.414 1.41-.645 1.41-1.425-.63-1.41-1.41-1.41zM8.61 17.247c1.2 0 2.056-.042 2.58-.12.526-.084.976-.222 1.32-.412.45-.232.78-.564 1.02-.99s.36-.915.36-1.48c0-.78-.21-1.403-.63-1.87-.42-.48-.99-.734-1.74-.794.66-.18 1.156-.45 1.456-.81.315-.344.465-.824.465-1.424 0-.48-.103-.885-.3-1.26-.21-.36-.493-.645-.883-.87-.345-.195-.735-.315-1.215-.405-.464-.074-1.29-.12-2.474-.12H5.654v10.486H8.61zm.736-4.185c.705 0 1.185.088 1.44.262.27.18.39.495.39.93 0 .405-.135.69-.42.855-.27.18-.765.254-1.44.254H8.31v-2.297h1.05zm8.656.706v-7.06h-2.46v7.06H18zM8.925 9.08c.71 0 1.185.08 1.432.24.245.16.367.435.367.83 0 .38-.13.646-.39.804-.265.154-.747.232-1.452.232h-.57V9.08h.615z',
};

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  if (platform === 'unityroom') {
    return (
      <span className="community-social-icon is-unityroom" aria-hidden="true">
        <svg viewBox="0 0 100 142" focusable="false">
          <g transform="translate(-465 -316)">
            <g transform="translate(93.4661 -54.75)">
              <g transform="matrix(1.14612 0 0 1.14612 -59.1453 -78.6245)">
                <g transform="matrix(.87251 0 0 .87251 -29.9452 116.371)">
                  <path
                    className="community-unityroom-door"
                    d="M564.867 339.624c0-3.314-2.044-6.285-5.139-7.471l-39.482-15.124a8 8 0 0 0-10.862 7.471V450a8 8 0 0 0 10.862 7.471l39.482-15.124a8 8 0 0 0 5.139-7.471v-95.252Zm-34.472 39.626a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z"
                  />
                </g>
                <g transform="matrix(.798724 0 0 1.0024 74.5112 10.6876)">
                  <path
                    className="community-unityroom-frame"
                    d="M411.739 400c0-3.846-3.913-6.963-8.739-6.963h-16c-4.826 0-8.739 3.117-8.739 6.963v85c0 3.846 3.913 6.963 8.739 6.963h16c4.826 0 8.739-3.117 8.739-6.963v-85Z"
                  />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </span>
    );
  }

  return (
    <span className={`community-social-icon is-${platform}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={SOCIAL_ICON_PATHS[platform]} />
      </svg>
    </span>
  );
}

function mergeOwnProfile(privateUser: CommunityUser, publicUser: CommunityUser): CommunityUser {
  return {
    ...publicUser,
    ...privateUser,
    websiteUrl: publicUser.websiteUrl ?? privateUser.websiteUrl,
    socialLinks: Object.keys(publicUser.socialLinks ?? {}).length
      ? publicUser.socialLinks
      : privateUser.socialLinks,
    followerCount: publicUser.followerCount,
    followingCount: publicUser.followingCount,
    followedByMe: publicUser.followedByMe,
  };
}

function Avatar({
  user,
  name,
  url,
  large,
}: {
  user?: CommunityUser;
  name?: string;
  url?: string | null;
  large?: boolean;
}) {
  const label = user?.displayName || name || '?';
  const source = user?.avatarUrl || url;
  return (
    <span className={`community-avatar${large ? ' is-large' : ''}`}>
      <span>{label.slice(0, 1).toUpperCase()}</span>
      {source ? (
        <img
          src={source}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
    </span>
  );
}

function ModalLayer(props: {
  modal: Modal;
  token: string;
  user: CommunityUser | null;
  ja: boolean;
  busy: boolean;
  error: string;
  defaultAuthorName: string;
  postImages: string[];
  updatePostImages: (images: string[]) => void;
  avatarImage: string;
  headerImage: string;
  suggestedTags: string[];
  close: () => void;
  setAuthMode: (mode: 'login' | 'register') => void;
  authenticate: (event: FormEvent<HTMLFormElement>, mode: 'login' | 'register') => void;
  submitPost: (event: FormEvent<HTMLFormElement>) => void;
  saveProfile: (event: FormEvent<HTMLFormElement>) => void;
  removePost: (post: CommunityPost) => void;
  requestDelete: (post: CommunityPost) => void;
  openLikes: (post: CommunityPost) => void;
  canDeletePost: (post: CommunityPost) => boolean;
  openTag: (tag: string) => void;
  openProfile: (loginId: string) => void;
  toggleLike: (post: CommunityPost) => void;
  readPost: (files?: FileList | null) => void;
  readAvatar: (file?: File) => void;
  readHeader: (file?: File) => void;
}) {
  const { modal, user, ja, busy, error, close } = props;
  if (modal.kind === 'none') return null;
  return (
    <div
      className="community-modal-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {modal.kind === 'auth' ? <AuthDialog {...props} mode={modal.mode} /> : null}
      {modal.kind === 'create' && user ? <CreateDialog {...props} user={user} /> : null}
      {modal.kind === 'post' ? (
        <PostDialog
          post={modal.post}
          ja={ja}
          close={close}
          toggleLike={props.toggleLike}
          openLikes={() => props.openLikes(modal.post)}
          token={props.token}
          viewerLoginId={user?.loginId}
          onDelete={
            props.canDeletePost(modal.post) ? () => props.requestDelete(modal.post) : undefined
          }
          onTagClick={props.openTag}
          onAuthorClick={
            modal.post.authorLoginId
              ? () => props.openProfile(modal.post.authorLoginId as string)
              : undefined
          }
          onCommentAuthorClick={props.openProfile}
        />
      ) : null}
      {modal.kind === 'profile' && user ? <ProfileDialog {...props} user={user} /> : null}
      {modal.kind === 'connections' ? (
        <ConnectionsDialog
          modal={modal}
          ja={ja}
          error={error}
          close={close}
          openProfile={props.openProfile}
        />
      ) : null}
      {modal.kind === 'likes' ? (
        <LikesDialog modal={modal} ja={ja} close={close} openProfile={props.openProfile} />
      ) : null}
      {modal.kind === 'delete' ? (
        <ConfirmDialog
          ja={ja}
          busy={busy}
          error={error}
          close={close}
          confirm={() => props.removePost(modal.post)}
        />
      ) : null}
      {modal.kind === 'sent' ? (
        <section className="community-dialog community-sent">
          <span>✓</span>
          <h2>{ja ? '投稿を受け付けました' : 'Post submitted'}</h2>
          <p>{ja ? '運営の確認後に公開されます。' : 'It will be published after review.'}</p>
          <button onClick={close}>{ja ? '閉じる' : 'Close'}</button>
        </section>
      ) : null}
    </div>
  );
}

function DialogHeader({ title, close }: { title: string; close: () => void }) {
  return (
    <header className="community-dialog-header">
      <h2>{title}</h2>
      <button type="button" onClick={close}>
        <Glyph name="close" />
      </button>
    </header>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="community-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function ErrorMessage({ text }: { text: string }) {
  return text ? (
    <p className="community-form-error" role="alert">
      {text}
    </p>
  ) : null;
}
function Busy() {
  return <span className="community-spinner" />;
}

function AuthDialog(props: Parameters<typeof ModalLayer>[0] & { mode: 'login' | 'register' }) {
  const { mode, ja, busy, error, close, setAuthMode, authenticate, defaultAuthorName } = props;
  const [showPassword, setShowPassword] = useState(false);
  const registering = mode === 'register';
  return (
    <form
      className="community-dialog community-auth"
      method="post"
      autoComplete="off"
      data-1p-ignore
      data-lpignore="true"
      data-bwignore="true"
      onSubmitCapture={(event) => event.preventDefault()}
      onSubmit={(event) => authenticate(event, mode)}
    >
      <button
        className="community-auth-close"
        type="button"
        onClick={close}
        aria-label={ja ? '閉じる' : 'Close'}
      >
        <Glyph name="close" />
      </button>
      <section className="community-auth-intro">
        <div className="community-auth-brand">
          <img src={browser.runtime.getURL('community/activity-icon.png' as never)} alt="" />
          <strong>{ja ? 'みんなの活動' : 'Campus Community'}</strong>
        </div>
        <div className="community-auth-intro-copy">
          <small>CAMPUS COMMUNITY</small>
          <h2>{ja ? 'キャンパスの日常を、もっと近くに。' : 'Campus life, closer together.'}</h2>
          <p>
            {ja
              ? '作品やイベント、クラブ活動。学生の「今」を見つけて、あなたの活動も共有できます。'
              : 'Discover student work, events and clubs—and share what you are doing.'}
          </p>
        </div>
        <p className="community-auth-view-note">
          {ja
            ? '投稿を見るだけならアカウントは必要ありません。'
            : 'No account is needed to browse posts.'}
        </p>
      </section>
      <section className="community-auth-panel">
        <header>
          <small>
            {registering
              ? ja
                ? 'はじめての方'
                : 'New here'
              : ja
                ? 'おかえりなさい'
                : 'Welcome back'}
          </small>
          <h2>
            {registering
              ? ja
                ? 'アカウントを作成'
                : 'Create an account'
              : ja
                ? 'ログイン'
                : 'Log in'}
          </h2>
          <p>
            {registering
              ? ja
                ? '投稿やいいね、フォローができるようになります。'
                : 'Post, like and follow other members.'
              : ja
                ? '登録したユーザーIDで続けます。'
                : 'Continue with your user ID.'}
          </p>
        </header>
        <div className="community-auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={registering}
            className={registering ? 'is-active' : ''}
            onClick={() => setAuthMode('register')}
          >
            {ja ? '新規登録' : 'Sign up'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!registering}
            className={!registering ? 'is-active' : ''}
            onClick={() => setAuthMode('login')}
          >
            {ja ? 'ログイン' : 'Log in'}
          </button>
        </div>
        <div className="community-auth-fields">
          {registering ? (
            <Field label={ja ? '表示名' : 'Display name'}>
              <input
                name="displayName"
                defaultValue={defaultAuthorName}
                maxLength={40}
                autoComplete="name"
                data-1p-ignore
                data-lpignore="true"
                placeholder={ja ? 'みんなに表示する名前' : 'Name shown to others'}
                required
              />
            </Field>
          ) : null}
          <Field label={ja ? 'ユーザーID' : 'User ID'}>
            <input
              name="communityLoginId"
              minLength={4}
              maxLength={32}
              pattern="[A-Za-z0-9_.-]+"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore="true"
              placeholder={ja ? '半角英数字・記号で4文字以上' : '4 or more characters'}
              autoFocus
              required
            />
          </Field>
          <Field label={ja ? 'パスワード' : 'Password'}>
            <span className="community-password-field">
              <input
                className={showPassword ? '' : 'is-masked'}
                name="communitySecret"
                type="text"
                minLength={8}
                maxLength={128}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
                placeholder={ja ? '8文字以上' : '8 or more characters'}
                required
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? (ja ? '隠す' : 'Hide') : ja ? '表示' : 'Show'}
              </button>
            </span>
          </Field>
          {registering ? (
            <>
              <Field label={ja ? 'パスワード（確認）' : 'Confirm password'}>
                <input
                  className={showPassword ? '' : 'is-masked'}
                  name="communitySecretConfirmation"
                  type="text"
                  minLength={8}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  data-bwignore="true"
                  placeholder={ja ? 'もう一度入力' : 'Enter it again'}
                  required
                />
              </Field>
              <aside className="community-auth-security-note">
                <strong>
                  {ja ? '学校の認証情報は使用しないでください' : 'Do not use school credentials'}
                </strong>
                <span>
                  {ja
                    ? 'このアカウントは学校のアカウントとは無関係です。学校のIDやパスワードと同じものは絶対に設定しないでください。'
                    : 'This account is separate from your school account. Never reuse your school ID or password.'}
                </span>
              </aside>
            </>
          ) : null}
        </div>
        <ErrorMessage text={error} />
        <button className="community-submit" style={{ marginTop: 20 }} disabled={busy}>
          {busy ? <Busy /> : null}
          {registering ? (ja ? 'アカウントを作成' : 'Create account') : ja ? 'ログイン' : 'Log in'}
        </button>
        <p className="community-auth-switch">
          {registering
            ? ja
              ? 'すでにアカウントをお持ちですか？'
              : 'Already have an account?'
            : ja
              ? 'アカウントをお持ちでないですか？'
              : 'New to the community?'}
          <button type="button" onClick={() => setAuthMode(registering ? 'login' : 'register')}>
            {registering ? (ja ? 'ログイン' : 'Log in') : ja ? '新規登録' : 'Sign up'}
          </button>
        </p>
      </section>
    </form>
  );
}

function CreateDialog(props: Parameters<typeof ModalLayer>[0] & { user: CommunityUser }) {
  const {
    ja,
    busy,
    error,
    close,
    postImages,
    updatePostImages,
    readPost,
    submitPost,
    suggestedTags,
    user,
  } = props;
  const imageInput = useRef<HTMLInputElement>(null);
  const captionInput = useRef<HTMLTextAreaElement>(null);
  const [caption, setCaption] = useState('');
  const [tagSearch, setTagSearch] = useState<string | null>(null);
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [draggedImage, setDraggedImage] = useState<number | null>(null);
  const [dragTargetImage, setDragTargetImage] = useState<number | null>(null);
  const dragPreview = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedImage >= postImages.length) setSelectedImage(Math.max(0, postImages.length - 1));
  }, [postImages.length, selectedImage]);

  useEffect(
    () => () => {
      dragPreview.current?.remove();
    },
    [],
  );

  const removeDragPreview = () => {
    dragPreview.current?.remove();
    dragPreview.current = null;
  };

  const createDragPreview = (image: string, index: number) => {
    removeDragPreview();
    const preview = document.createElement('div');
    preview.className = 'community-image-drag-preview';
    const previewImage = document.createElement('img');
    previewImage.src = image;
    const badge = document.createElement('span');
    badge.textContent = String(index + 1);
    preview.append(previewImage, badge);
    (document.getElementById('portal-overlay') ?? document.body).appendChild(preview);
    dragPreview.current = preview;
    return preview;
  };

  const moveImage = (from: number, to: number) => {
    if (from === to) return;
    const next = [...postImages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updatePostImages(next);
    setSelectedImage(to);
  };

  const removeImage = (index: number) => {
    const next = postImages.filter((_, imageIndex) => imageIndex !== index);
    updatePostImages(next);
    setSelectedImage((current) => {
      if (!next.length) return 0;
      if (current === index) return Math.min(index, next.length - 1);
      return current > index ? current - 1 : current;
    });
  };

  const matchingTags = useMemo(() => {
    if (tagSearch === null) return [];
    const needle = tagSearch.toLocaleLowerCase();
    return suggestedTags
      .filter((tag) => !needle || tag.toLocaleLowerCase().includes(needle))
      .slice(0, 6);
  }, [suggestedTags, tagSearch]);

  const updateTagSearch = (value: string, caret: number | null) => {
    const beforeCaret = value.slice(0, caret ?? value.length);
    const match = beforeCaret.match(activeTagPattern);
    setActiveTagIndex(0);
    setTagSearch(match ? match[1] : null);
  };

  const insertTag = (tag: string) => {
    const textarea = captionInput.current;
    if (!textarea) return;
    const caret = textarea.selectionStart ?? caption.length;
    const beforeCaret = caption.slice(0, caret);
    const match = beforeCaret.match(activeTagPattern);
    if (!match) return;
    const hashIndex = caret - match[1].length - 1;
    const replacement = `#${tag} `;
    const next = caption.slice(0, hashIndex) + replacement + caption.slice(caret);
    const nextCaret = hashIndex + replacement.length;
    setCaption(next);
    setTagSearch(null);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  return (
    <form
      className="community-dialog community-create-dialog"
      method="post"
      onSubmitCapture={(event) => event.preventDefault()}
      onSubmit={submitPost}
    >
      <DialogHeader title={ja ? '新しい投稿' : 'New post'} close={close} />
      <div className="community-create-body">
        <section className="community-image-composer">
          <header className="community-composer-media-head">
            <div>
              <strong>{ja ? '写真' : 'Photos'}</strong>
              <span>{ja ? '最大4枚・1枚6MBまで' : 'Up to 4 photos · 6MB each'}</span>
            </div>
            {postImages.length < 4 ? (
              <label htmlFor="community-post-images">
                <Glyph name="plus" />
                {postImages.length ? (ja ? '追加' : 'Add') : ja ? '選択' : 'Choose'}
              </label>
            ) : (
              <span>{postImages.length}/4</span>
            )}
          </header>
          <div className={`community-composer-stage${postImages.length ? ' has-image' : ''}`}>
            {postImages.length ? (
              <img src={postImages[selectedImage]} alt="" />
            ) : (
              <label className="community-composer-empty" htmlFor="community-post-images">
                <Glyph name="image" />
                <strong>{ja ? '投稿する写真を追加' : 'Add photos'}</strong>
                <span>{ja ? 'クリックして写真を選択' : 'Click to choose photos'}</span>
                <small>JPEG / PNG / WebP</small>
              </label>
            )}
          </div>
          {postImages.length ? (
            <div className="community-composer-filmstrip">
              <div className="community-composer-filmstrip-list">
                {postImages.map((image, index) => (
                  <div
                    className={`community-composer-thumb${selectedImage === index ? ' is-selected' : ''}${draggedImage === index ? ' is-dragging' : ''}${dragTargetImage === index && draggedImage !== index ? ' is-drop-target' : ''}`}
                    draggable
                    key={`${image.slice(-24)}-${index}`}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(index));
                      event.dataTransfer.setDragImage(createDragPreview(image, index), 39, 39);
                      setDraggedImage(index);
                    }}
                    onDragEnd={() => {
                      removeDragPreview();
                      setDraggedImage(null);
                      setDragTargetImage(null);
                    }}
                    onDragEnter={() => setDragTargetImage(index)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const source =
                        draggedImage ?? Number(event.dataTransfer.getData('text/plain'));
                      if (Number.isInteger(source)) moveImage(source, index);
                      removeDragPreview();
                      setDraggedImage(null);
                      setDragTargetImage(null);
                    }}
                  >
                    <button
                      className="community-composer-thumb-preview"
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      aria-label={`${ja ? '写真' : 'Photo'} ${index + 1}`}
                    >
                      <img src={image} alt="" />
                      <span>{index + 1}</span>
                    </button>
                    <button
                      className="community-composer-thumb-remove"
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label={ja ? `写真${index + 1}を削除` : `Remove photo ${index + 1}`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <p>
                <span aria-hidden="true">⠿</span>
                {ja ? 'ドラッグして表示順を変更' : 'Drag to change the order'}
              </p>
            </div>
          ) : null}
          <input
            id="community-post-images"
            ref={imageInput}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              readPost(event.currentTarget.files);
              event.currentTarget.value = '';
            }}
          />
        </section>
        <div className="community-fields">
          <div className="community-posting-user">
            <Avatar user={user} />
            <span>
              <strong>{user.displayName}</strong>
              <small>@{user.loginId}</small>
            </span>
          </div>
          <Field label={ja ? 'タイトル' : 'Title'}>
            <input
              name="title"
              maxLength={80}
              placeholder={ja ? '投稿のタイトル' : 'Give your post a title'}
              required
            />
          </Field>
          <div className="community-caption-field">
            <Field label={ja ? '本文' : 'Caption'}>
              <textarea
                ref={captionInput}
                name="caption"
                rows={7}
                maxLength={1000}
                value={caption}
                placeholder={
                  ja
                    ? '活動について書いてみましょう。\n# を入力するとタグを追加できます。'
                    : 'Tell everyone about this activity.\nType # to add a tag.'
                }
                onChange={(event) => {
                  setCaption(event.currentTarget.value);
                  updateTagSearch(event.currentTarget.value, event.currentTarget.selectionStart);
                }}
                onClick={(event) =>
                  updateTagSearch(event.currentTarget.value, event.currentTarget.selectionStart)
                }
                onBlur={() => setTagSearch(null)}
                onKeyDown={(event) => {
                  if (tagSearch === null || matchingTags.length === 0) return;
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveTagIndex((index) => (index + 1) % matchingTags.length);
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveTagIndex(
                      (index) => (index - 1 + matchingTags.length) % matchingTags.length,
                    );
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    insertTag(matchingTags[activeTagIndex] ?? matchingTags[0]);
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === 'Escape') setTagSearch(null);
                  else if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key))
                    updateTagSearch(event.currentTarget.value, event.currentTarget.selectionStart);
                }}
                required
              />
            </Field>
            {tagSearch !== null ? (
              <div
                className="community-tag-suggestions"
                role="listbox"
                aria-label={ja ? 'タグ候補' : 'Tag suggestions'}
              >
                <header>
                  <span>{ja ? 'タグ候補' : 'Suggested tags'}</span>
                  <small>{ja ? '選択して本文に追加' : 'Select to insert'}</small>
                </header>
                {matchingTags.length ? (
                  matchingTags.map((item, index) => (
                    <button
                      className={index === activeTagIndex ? 'is-active' : ''}
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={index === activeTagIndex}
                      onMouseEnter={() => setActiveTagIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertTag(item)}
                    >
                      <b>#</b>
                      <span>{item}</span>
                    </button>
                  ))
                ) : tagSearch ? (
                  <div className="community-tag-new">
                    <b>#{tagSearch}</b>
                    <span>{ja ? '新しいタグとして投稿できます' : 'This will be a new tag'}</span>
                  </div>
                ) : (
                  <div className="community-tag-new">
                    <span>
                      {ja
                        ? '文字を続けて入力すると新しいタグを作れます'
                        : 'Keep typing to create a new tag'}
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
          <p className="community-help">
            {ja ? '投稿は運営による審査後に公開されます。' : 'Posts are published after review.'}
          </p>
          <ErrorMessage text={error} />
        </div>
      </div>
      <footer>
        <button type="button" onClick={close}>
          {ja ? 'キャンセル' : 'Cancel'}
        </button>
        <button className="is-primary" disabled={busy || !postImages.length}>
          {busy ? <Busy /> : null}
          {ja ? '審査へ送信' : 'Submit'}
        </button>
      </footer>
    </form>
  );
}

function PostDialog({
  post,
  ja,
  close,
  toggleLike,
  openLikes,
  onDelete,
  onTagClick,
  onAuthorClick,
  onCommentAuthorClick,
  token,
  viewerLoginId,
}: {
  post: CommunityPost;
  ja: boolean;
  close: () => void;
  toggleLike: (post: CommunityPost) => void;
  openLikes: () => void;
  onDelete?: () => void;
  onTagClick: (tag: string) => void;
  onAuthorClick?: () => void;
  onCommentAuthorClick: (loginId: string) => void;
  token: string;
  viewerLoginId?: string;
}) {
  const images = post.imageUrls?.length ? post.imageUrls : [post.previewUrl || post.imageUrl];
  const [imageIndex, setImageIndex] = useState(0);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setCommentsLoading(true);
    communityApi.postComments(post.id, token || undefined)
      .then((result) => { if (active) setComments(result.comments); })
      .catch(() => { if (active) setCommentError(ja ? 'コメントを読み込めませんでした。' : 'Could not load comments.'); })
      .finally(() => { if (active) setCommentsLoading(false); });
    return () => { active = false; };
  }, [ja, post.id, token]);

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    const content = commentText.trim();
    if (!content || !token || commentBusy) return;
    setCommentBusy(true);
    setCommentError('');
    try {
      const result = await communityApi.createComment(token, post.id, content);
      setComments((current) => [...current, result.comment]);
      setCommentText('');
    } catch (submitError) {
      setCommentError(submitError instanceof Error ? submitError.message : (ja ? '送信できませんでした。' : 'Could not submit.'));
    } finally {
      setCommentBusy(false);
    }
  };
  const deleteComment = async (comment: CommunityComment) => {
    if (!token || !window.confirm(ja ? 'このコメントを削除しますか？' : 'Delete this comment?')) return;
    setCommentError('');
    try {
      await communityApi.deleteComment(token, post.id, comment.id);
      setComments((current) => current.filter((item) => item.id !== comment.id));
    } catch (deleteError) {
      setCommentError(deleteError instanceof Error ? deleteError.message : (ja ? '削除できませんでした。' : 'Could not delete comment.'));
    }
  };
  const reportPost = async () => {
    if (!token) return;
    const reason = window.prompt(ja ? '通報理由を入力してください' : 'Report reason');
    if (!reason?.trim() || reportBusy) return;
    setReportBusy(true);
    setCommentError('');
    try {
      await communityApi.report(token, 'post', post.id, reason);
      window.alert(ja ? '通報を送信しました。' : 'Report submitted.');
    } catch (reportError) {
      setCommentError(reportError instanceof Error ? reportError.message : (ja ? '通報できませんでした。' : 'Could not report.'));
    } finally {
      setReportBusy(false);
    }
  };
  return (
    <article className="community-post-dialog">
      <div className="community-post-viewer-image">
        <div
          className="community-post-viewer-track"
          style={{ transform: `translateX(-${imageIndex * 100}%)` }}
        >
          {images.map((image, index) => (
            <img src={image} alt="" key={`${image}-${index}`} />
          ))}
        </div>
        {images.length > 1 ? (
          <>
            <button
              className="is-prev"
              type="button"
              onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)}
              aria-label={ja ? '前の写真' : 'Previous photo'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m15 5-7 7 7 7" />
              </svg>
            </button>
            <button
              className="is-next"
              type="button"
              onClick={() => setImageIndex((imageIndex + 1) % images.length)}
              aria-label={ja ? '次の写真' : 'Next photo'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 5 7 7-7 7" />
              </svg>
            </button>
            <span>
              {imageIndex + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>

      <section className="community-post-viewer-panel">
        <header className="community-post-viewer-head">
          <button
            className="community-post-author"
            type="button"
            onClick={onAuthorClick}
            disabled={!onAuthorClick}
            aria-label={onAuthorClick ? `${post.authorName}のプロフィールを開く` : undefined}
          >
            <Avatar name={post.authorName} url={post.authorAvatarUrl} />
            <div><strong>{post.authorName}</strong><span>@{post.authorLoginId}</span></div>
          </button>
          <div className="community-post-header-actions">
            <time>{new Date(post.createdAt).toLocaleDateString(ja ? 'ja-JP' : 'en-US')}</time>
            {token && viewerLoginId?.toLocaleLowerCase() !== post.authorLoginId.toLocaleLowerCase() ? <button className="community-post-delete" type="button" disabled={reportBusy} onClick={() => void reportPost()}>{ja ? '通報' : 'Report'}</button> : null}
            {onDelete ? <button className="community-post-delete" type="button" onClick={onDelete}>{ja ? '削除' : 'Delete'}</button> : null}
            <button className="community-post-close" onClick={close} aria-label={ja ? '閉じる' : 'Close'}><Glyph name="close" /></button>
          </div>
        </header>
        <section className="community-post-content">
          <div className="community-post-copy">
            <h2>{post.title}</h2>
          </div>
          {post.caption.trim() ? (
            <div className="community-post-caption">
              <p>{renderCaptionWithTags(post.caption, onTagClick)}</p>
            </div>
          ) : null}
        </section>
        {post.rejectionReason ? (
          <aside>
            <strong>{ja ? '非公開の理由' : 'Reason'}</strong>
            {post.rejectionReason}
          </aside>
        ) : null}
        <div className="community-post-actions">
          <button
            className={`community-detail-like${post.likedByMe ? ' is-active' : ''}`}
            type="button"
            onClick={() => toggleLike(post)}
            aria-label={ja ? 'いいね' : 'Like'}
          >
            <span className="community-like-icon"><Glyph name="heart" /></span>
            <span className="community-like-copy">
              <strong>{post.likedByMe ? (ja ? 'いいね済み' : 'Liked') : (ja ? 'いいね' : 'Like')}</strong>
              <small>{post.likeCount.toLocaleString()} {ja ? '件' : ''}</small>
            </span>
          </button>
          <button className="community-post-likes-list" type="button" onClick={openLikes}>
            <span>{ja ? 'いいねした人' : 'People who liked this'}</span>
            <span aria-hidden>›</span>
          </button>
        </div>
        <div className="community-comments">
          <div className="community-comments-heading">
            <strong>{ja ? 'コメント' : 'Comments'}</strong>
            <span>{comments.length}</span>
          </div>
          <div className="community-comment-list">
            {commentsLoading ? <p>{ja ? '読み込み中…' : 'Loading…'}</p> : comments.length ? comments.map((comment) => (
              <article className={`community-comment is-${comment.status}`} key={comment.id}>
                <button
                  className="community-comment-author"
                  type="button"
                  onClick={() => onCommentAuthorClick(comment.authorLoginId)}
                  aria-label={`${comment.authorName}のプロフィールを開く`}
                >
                  <Avatar name={comment.authorName} url={comment.authorAvatarUrl} />
                </button>
                <div className="community-comment-card">
                  <header>
                    <button
                      className="community-comment-author-name"
                      type="button"
                      onClick={() => onCommentAuthorClick(comment.authorLoginId)}
                    >
                      <strong>{comment.authorName}</strong>
                      <span>@{comment.authorLoginId}</span>
                    </button>
                    <div className="community-comment-meta-actions">
                      {comment.status !== 'approved' ? (
                        <em className={`is-${comment.status}`}>
                          {comment.status === 'pending'
                            ? ja ? '審査中' : 'Pending'
                            : ja ? '却下' : 'Rejected'}
                        </em>
                      ) : null}
                      <time>{new Date(comment.createdAt).toLocaleDateString(ja ? 'ja-JP' : 'en-US')}</time>
                      {viewerLoginId?.toLocaleLowerCase() === comment.authorLoginId.toLocaleLowerCase() ? (
                        <button type="button" onClick={() => void deleteComment(comment)}>{ja ? '削除' : 'Delete'}</button>
                      ) : null}
                    </div>
                  </header>
                  <p>{comment.content}</p>
                  {comment.rejectionReason ? (
                    <small>
                      <b>{ja ? '却下理由' : 'Reason'}</b>
                      {comment.rejectionReason}
                    </small>
                  ) : null}
                </div>
              </article>
            )) : <p>{ja ? 'まだコメントはありません。' : 'No comments yet.'}</p>}
          </div>
          {token ? (
            <form className="community-comment-form" onSubmit={submitComment}>
              <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={500} rows={3} placeholder={ja ? 'コメントを書く' : 'Write a comment'} />
              <div><small>{ja ? 'すべてのコメントは審査後に公開されます。' : 'All comments are published after review.'}</small><button disabled={commentBusy || !commentText.trim()}>{commentBusy ? <Busy /> : null}{ja ? '審査へ送信' : 'Submit'}</button></div>
            </form>
          ) : <p className="community-comment-login-note">{ja ? 'コメントするにはログインしてください。' : 'Log in to comment.'}</p>}
          <ErrorMessage text={commentError} />
        </div>
      </section>
    </article>
  );
}

function ConnectionsDialog({
  modal,
  ja,
  error,
  close,
  openProfile,
}: {
  modal: Extract<Modal, { kind: 'connections' }>;
  ja: boolean;
  error: string;
  close: () => void;
  openProfile: (loginId: string) => void;
}) {
  const label =
    modal.relation === 'followers'
      ? ja
        ? 'フォロワー'
        : 'Followers'
      : ja
        ? 'フォロー中'
        : 'Following';
  return (
    <section className="community-dialog community-connections">
      <DialogHeader title={label} close={close} />
      <p className="community-connections-owner">{modal.ownerName}</p>
      {modal.loading ? (
        <div className="community-connections-state">
          <Busy />
          {ja ? '読み込み中' : 'Loading'}
        </div>
      ) : error ? (
        <ErrorMessage text={error} />
      ) : modal.users.length ? (
        <div className="community-connections-list">
          {modal.users.map((item) => (
            <button type="button" key={item.id} onClick={() => openProfile(item.loginId)}>
              <Avatar user={item} />
              <span>
                <strong>{item.displayName}</strong>
                <small>@{item.loginId}</small>
              </span>
              <em>{ja ? 'プロフィールを見る' : 'View profile'}</em>
            </button>
          ))}
        </div>
      ) : (
        <div className="community-connections-state">
          {modal.relation === 'followers'
            ? ja
              ? 'フォロワーはまだいません。'
              : 'No followers yet.'
            : ja
              ? 'まだ誰もフォローしていません。'
              : 'Not following anyone yet.'}
        </div>
      )}
    </section>
  );
}

function LikesDialog({
  modal,
  ja,
  close,
  openProfile,
}: {
  modal: Extract<Modal, { kind: 'likes' }>;
  ja: boolean;
  close: () => void;
  openProfile: (loginId: string) => void;
}) {
  return (
    <section className="community-dialog community-connections">
      <DialogHeader title={ja ? 'いいねした人' : 'Liked by'} close={close} />
      {modal.loading ? (
        <div className="community-connections-state">
          <Busy />
          {ja ? '読み込み中' : 'Loading'}
        </div>
      ) : modal.users.length ? (
        <div className="community-connections-list">
          {modal.users.map((item) => (
            <button type="button" key={item.id} onClick={() => openProfile(item.loginId)}>
              <Avatar user={item} />
              <span>
                <strong>{item.displayName}</strong>
                <small>@{item.loginId}</small>
              </span>
              <em>{ja ? 'プロフィールを見る' : 'View profile'}</em>
            </button>
          ))}
        </div>
      ) : (
        <div className="community-connections-state">
          {ja ? 'いいねはまだありません。' : 'No likes yet.'}
        </div>
      )}
    </section>
  );
}

function renderCaptionWithTags(caption: string, onTagClick: (tag: string) => void): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tagPattern = /[#＃]([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]{1,30})/gu;
  let lastIndex = 0;
  let key = 0;

  for (const match of caption.matchAll(tagPattern)) {
    const index = match.index ?? 0;
    const tag = match[1];
    if (index > lastIndex) nodes.push(caption.slice(lastIndex, index));
    nodes.push(
      <button
        className="community-caption-tag"
        key={`tag-${key++}`}
        type="button"
        onClick={() => onTagClick(tag)}
      >
        #{tag}
      </button>,
    );
    lastIndex = index + match[0].length;
  }

  if (lastIndex < caption.length) nodes.push(caption.slice(lastIndex));
  return nodes;
}

function ProfileDialog(props: Parameters<typeof ModalLayer>[0] & { user: CommunityUser }) {
  const {
    user,
    ja,
    busy,
    error,
    suggestedTags,
    avatarImage,
    headerImage,
    readAvatar,
    readHeader,
    saveProfile,
    close,
  } = props;
  const avatarInput = useRef<HTMLInputElement>(null);
  const headerInput = useRef<HTMLInputElement>(null);
  const profileTagsInput = useRef<HTMLInputElement>(null);
  const [academicGroup, setAcademicGroup] = useState(user.academicGroup ?? '');
  const [department, setDepartment] = useState(user.department ?? '');
  const [profileTagsValue, setProfileTagsValue] = useState(
    (user.pendingProfile?.profileTags ?? user.profileTags ?? []).map((tag) => `#${tag}`).join(' '),
  );
  const [profileTagSearch, setProfileTagSearch] = useState<string | null>(null);
  const [activeProfileTagIndex, setActiveProfileTagIndex] = useState(0);

  const matchingProfileTags = useMemo(() => {
    if (profileTagSearch === null) return [];
    const needle = profileTagSearch.toLocaleLowerCase();
    return suggestedTags
      .filter((tag) => !needle || tag.toLocaleLowerCase().includes(needle))
      .slice(0, 6);
  }, [profileTagSearch, suggestedTags]);

  const updateProfileTagSearch = (value: string, caret: number | null) => {
    const match = value.slice(0, caret ?? value.length).match(activeTagPattern);
    setActiveProfileTagIndex(0);
    setProfileTagSearch(match ? match[1] : null);
  };

  const insertProfileTag = (tag: string) => {
    const input = profileTagsInput.current;
    if (!input) return;
    const caret = input.selectionStart ?? profileTagsValue.length;
    const beforeCaret = profileTagsValue.slice(0, caret);
    const match = beforeCaret.match(activeTagPattern);
    if (!match) return;
    const hashIndex = caret - match[1].length - 1;
    const replacement = `#${tag} `;
    const next = profileTagsValue.slice(0, hashIndex) + replacement + profileTagsValue.slice(caret);
    const nextCaret = hashIndex + replacement.length;
    setProfileTagsValue(next);
    setProfileTagSearch(null);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const chooseImage = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.value = '';
    input.click();
  };

  return (
    <form
      className="community-dialog community-profile-dialog"
      method="post"
      onSubmitCapture={(event) => event.preventDefault()}
      onSubmit={saveProfile}
    >
      <DialogHeader title={ja ? 'プロフィールを編集' : 'Edit profile'} close={close} />
      <aside className="community-profile-review-note">
        <strong>
          {ja ? '変更は審査後に公開されます。' : 'Changes are published after review.'}
        </strong>
      </aside>
      <div className="community-profile-editor-media">
        <div className="community-profile-editor-section-head">
          <strong>{ja ? 'プロフィール画像' : 'Profile images'}</strong>
          <span>{ja ? 'アイコンは2MB、ヘッダー画像は5MBまで' : 'Avatar 2MB · Header 5MB'}</span>
        </div>
        <div className="community-profile-editor-header">
          {headerImage || user.headerUrl ? (
            <img src={headerImage || user.headerUrl || undefined} alt="" />
          ) : (
            <div className="community-profile-editor-header-empty" aria-hidden="true" />
          )}
          <button type="button" onClick={() => chooseImage(headerInput.current)}>
            {user.profileState === 'editing'
              ? ja
                ? 'ヘッダー画像を再選択'
                : 'Choose another header'
              : headerImage || user.headerUrl
                ? ja
                  ? 'ヘッダー画像を変更'
                  : 'Change header'
                : ja
                  ? 'ヘッダー画像を選択'
                  : 'Choose header'}
          </button>
        </div>
        <input
          className="community-profile-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={headerInput}
          onChange={(event) => {
            readHeader(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <div className="community-profile-editor-identity">
          <Avatar name={user.displayName} url={avatarImage || user.avatarUrl} large />
          <div>
            <strong>{user.pendingProfile?.displayName || user.displayName}</strong>
            <small>@{user.loginId}</small>
          </div>
          <button type="button" onClick={() => chooseImage(avatarInput.current)}>
            {user.profileState === 'editing'
              ? ja
                ? '画像を再選択'
                : 'Choose another image'
              : ja
                ? '画像を選択'
                : 'Choose image'}
          </button>
          <input
            className="community-profile-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={avatarInput}
            onChange={(event) => {
              readAvatar(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </div>
      </div>
      <div className="community-profile-editor-fields">
        <div className="community-profile-editor-section-head">
          <strong>{ja ? 'プロフィール情報' : 'Profile information'}</strong>
          <span>
            {ja ? '公開される情報を入力してください' : 'Information shown on your profile'}
          </span>
        </div>
        <div className="community-academic-editor">
          <div className="community-profile-editor-section-head">
            <strong>{ja ? '所属' : 'Academic program'}</strong>
            <span>{ja ? '学系・学科は審査なしで即時反映されます' : 'Saved immediately without review'}</span>
          </div>
          <div className="community-academic-selects">
            <Field label={ja ? '学系' : 'Academic group'}>
              <select
                name="academicGroup"
                value={academicGroup}
                onChange={(event) => {
                  setAcademicGroup(event.target.value);
                  setDepartment('');
                }}
              >
                <option value="">{ja ? '未設定' : 'Not set'}</option>
                {Object.keys(ACADEMIC_GROUPS).map((group) => <option value={group} key={group}>{group}</option>)}
              </select>
            </Field>
            <Field label={ja ? '学科' : 'Department'}>
              <select name="department" value={department} onChange={(event) => setDepartment(event.target.value)} disabled={!academicGroup}>
                <option value="">{ja ? '未設定' : 'Not set'}</option>
                {(ACADEMIC_GROUPS[academicGroup] ?? []).map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </Field>
          </div>
        </div>
        <Field label={ja ? '表示名' : 'Display name'}>
          <input
            name="displayName"
            defaultValue={user.pendingProfile?.displayName || user.displayName}
            maxLength={40}
            required
          />
        </Field>
        <Field label={ja ? '自己紹介' : 'Bio'}>
          <textarea
            name="bio"
            defaultValue={user.pendingProfile?.bio ?? user.bio}
            maxLength={160}
            rows={4}
          />
        </Field>
        <Field label={ja ? 'プロフィールタグ' : 'Profile tags'}>
          <input
            ref={profileTagsInput}
            name="profileTags"
            value={profileTagsValue}
            onChange={(event) => {
              setProfileTagsValue(event.currentTarget.value);
              updateProfileTagSearch(event.currentTarget.value, event.currentTarget.selectionStart);
            }}
            onClick={(event) => updateProfileTagSearch(event.currentTarget.value, event.currentTarget.selectionStart)}
            onBlur={() => setProfileTagSearch(null)}
            onKeyDown={(event) => {
              if (profileTagSearch === null || matchingProfileTags.length === 0) return;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveProfileTagIndex((index) => (index + 1) % matchingProfileTags.length);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveProfileTagIndex((index) => (index - 1 + matchingProfileTags.length) % matchingProfileTags.length);
              } else if (event.key === 'Enter') {
                event.preventDefault();
                insertProfileTag(matchingProfileTags[activeProfileTagIndex] ?? matchingProfileTags[0]);
              }
            }}
            onKeyUp={(event) => {
              if (event.key === 'Escape') setProfileTagSearch(null);
              else if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key))
                updateProfileTagSearch(event.currentTarget.value, event.currentTarget.selectionStart);
            }}
            maxLength={320}
            placeholder={ja ? '#ゲーム #デザイン #プログラミング' : '#game #design #programming'}
          />
        </Field>
        {profileTagSearch !== null ? (
          <div className="community-tag-suggestions is-profile-tags" role="listbox" aria-label={ja ? 'タグ候補' : 'Tag suggestions'}>
            <header>
              <span>{ja ? 'タグ候補' : 'Suggested tags'}</span>
              <small>{ja ? '選択してプロフィールタグに追加' : 'Select to insert'}</small>
            </header>
            {matchingProfileTags.length ? (
              matchingProfileTags.map((item, index) => (
                <button
                  className={index === activeProfileTagIndex ? 'is-active' : ''}
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={index === activeProfileTagIndex}
                  onMouseEnter={() => setActiveProfileTagIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertProfileTag(item)}
                >
                  <b>#</b>
                  <span>{item}</span>
                </button>
              ))
            ) : profileTagSearch ? (
              <div className="community-tag-new">
                <b>#{profileTagSearch}</b>
                <span>{ja ? '新しいタグとして申請できます' : 'This will be a new tag'}</span>
              </div>
            ) : (
              <div className="community-tag-new">
                <span>{ja ? '文字を続けて入力すると新しいタグを作れます' : 'Keep typing to create a new tag'}</span>
              </div>
            )}
          </div>
        ) : null}
        <p className="community-help">
          {ja ? 'タグはプロフィール審査後に別枠で公開されます。最大10個まで。' : 'Tags are published separately after profile review. Up to 10 tags.'}
        </p>
        <Field label={ja ? 'URL' : 'Website'}>
          <input
            name="websiteUrl"
            type="url"
            inputMode="url"
            defaultValue={user.pendingProfile?.websiteUrl ?? user.websiteUrl ?? ''}
            maxLength={300}
            placeholder="https://example.com"
          />
        </Field>
        <div className="community-social-editor">
          <div className="community-profile-editor-section-head">
            <strong>{ja ? '外部リンク' : 'Social links'}</strong>
            <span>
              {ja ? '設定したものだけプロフィールに表示されます' : 'Only filled links are shown'}
            </span>
          </div>
          {SOCIAL_PLATFORMS.map((platform) => (
            <Field label={platform.label} key={platform.key}>
              <span className="community-social-input">
                <SocialIcon platform={platform.key} />
                <input
                  name={`social_${platform.key}`}
                  type="url"
                  inputMode="url"
                  defaultValue={
                    user.pendingProfile?.socialLinks?.[platform.key] ??
                    user.socialLinks?.[platform.key] ??
                    ''
                  }
                  maxLength={300}
                  placeholder={platform.placeholder}
                />
              </span>
            </Field>
          ))}
        </div>
      </div>
      <ErrorMessage text={error} />
      <footer>
        <button type="button" onClick={close}>
          {ja ? 'キャンセル' : 'Cancel'}
        </button>
        <button className="is-primary" disabled={busy}>
          {busy ? <Busy /> : null}
          {ja ? '審査へ送信' : 'Submit for review'}
        </button>
      </footer>
    </form>
  );
}

function ConfirmDialog({
  ja,
  busy,
  error,
  close,
  confirm,
}: {
  ja: boolean;
  busy: boolean;
  error: string;
  close: () => void;
  confirm: () => void;
}) {
  return (
    <section className="community-dialog community-confirm">
      <span>!</span>
      <h2>{ja ? '投稿を削除しますか？' : 'Delete this post?'}</h2>
      <p>{ja ? 'この操作は取り消せません。' : 'This action cannot be undone.'}</p>
      <ErrorMessage text={error} />
      <div>
        <button onClick={close}>{ja ? 'キャンセル' : 'Cancel'}</button>
        <button className="is-danger" disabled={busy} onClick={confirm}>
          {busy ? <Busy /> : null}
          {ja ? '削除' : 'Delete'}
        </button>
      </div>
    </section>
  );
}
