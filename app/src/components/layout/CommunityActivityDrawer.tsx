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
import type { CommunityPage, CommunityPost, CommunityUser } from '../../features/community/types';
import '../../styles/community.css';

type Modal =
  | { kind: 'none' }
  | { kind: 'auth'; mode: 'login' | 'register' }
  | { kind: 'create' }
  | { kind: 'post'; post: CommunityPost }
  | { kind: 'profile' }
  | { kind: 'delete'; post: CommunityPost }
  | {
      kind: 'connections';
      relation: 'followers' | 'following';
      ownerName: string;
      users: CommunityUser[];
      loading: boolean;
    }
  | { kind: 'sent' };

const ALL_TAG = '__all__';

function Glyph({
  name,
}: {
  name: 'home' | 'search' | 'plus' | 'user' | 'close' | 'image' | 'heart';
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
  const [profileUser, setProfileUser] = useState<CommunityUser | null>(null);
  const [profilePosts, setProfilePosts] = useState<CommunityPost[]>([]);
  const [user, setUser] = useState<CommunityUser | null>(null);
  const [token, setToken] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState(ALL_TAG);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [postImage, setPostImage] = useState('');
  const [avatarImage, setAvatarImage] = useState('');
  const [headerImage, setHeaderImage] = useState('');
  const [closing, setClosing] = useState(false);
  const objectUrls = useRef<string[]>([]);
  const closeTimer = useRef<number | null>(null);

  const closeDrawer = useCallback(() => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 360);
  }, [closing, onClose]);

  const loadFeed = useCallback(
    async (authToken?: string) => {
      setLoading(true);
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
        setLoading(false);
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
            return { ...post, previewUrl: await communityApi.ownPostImage(authToken, post.id) };
          } catch {
            return post;
          }
        }),
      );
      objectUrls.current = hydrated.flatMap((post) => (post.previewUrl ? [post.previewUrl] : []));
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

  useEffect(() => {
    void loadFeed();
    void (async () => {
      const saved = await storage.get(SK.communityAuthToken);
      const authToken =
        typeof saved[SK.communityAuthToken] === 'string' ? saved[SK.communityAuthToken] : '';
      if (!authToken) return;
      try {
        const result = await communityApi.session(authToken);
        setToken(authToken);
        setUser(result.user);
        setProfileUser(result.user);
        void loadFeed(authToken);
        void loadOwn(authToken);
        void loadFollowing(authToken);
      } catch {
        await storage.set({ [SK.communityAuthToken]: '' });
      }
    })();
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      objectUrls.current.forEach(URL.revokeObjectURL);
    };
  }, [loadFeed, loadFollowing, loadOwn]);

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
          `${post.title} ${post.caption} ${post.authorName} ${post.tags.join(' ')}`
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
          `${post.title} ${post.caption} ${post.authorName} ${post.tags.join(' ')}`
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
    return [ALL_TAG, ...Array.from(seen).sort((a, b) => a.localeCompare(b, ja ? 'ja' : 'en'))];
  }, [ja, posts]);

  const go = (next: CommunityPage) => {
    if (next === 'following' && !user) {
      setModal({ kind: 'auth', mode: 'login' });
      return;
    }
    if (next === 'create') {
      setPostImage('');
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
      if (token) void loadOwn(token).then(setProfilePosts);
    }
    if (next === 'following' && token) void loadFollowing(token);
  };

  const openProfile = async (loginId: string) => {
    const normalized = loginId.trim();
    if (!normalized) return;
    setLoading(true);
    setError('');
    try {
      if (user && normalized.toLowerCase() === user.loginId.toLowerCase()) {
        setProfileUser(user);
        setProfilePosts(ownPosts);
        if (token) setProfilePosts(await loadOwn(token));
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
      setToken(result.token);
      setUser(result.user);
      setProfileUser(result.user);
      setModal({ kind: 'none' });
      void loadFeed(result.token);
      void loadOwn(result.token);
      void loadFollowing(result.token);
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
    setToken('');
    setUser(null);
    setOwnPosts([]);
    setFollowingPosts([]);
    setProfileUser(null);
    setProfilePosts([]);
    setPage('home');
  };

  const submitPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!postImage || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await Promise.all([
        communityApi.createPost(token, {
          title: form.get('title'),
          caption: form.get('caption'),
          imageDataUrl: postImage,
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1200)),
      ]);
      setPostImage('');
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
      const result = await communityApi.updateProfile(token, {
        displayName: form.get('displayName'),
        bio: form.get('bio'),
      });
      if (avatarImage) await communityApi.submitAvatar(token, avatarImage);
      if (headerImage) await communityApi.submitHeader(token, headerImage);
      setUser({
        ...result.user,
        avatarStatus: avatarImage ? 'pending' : result.user.avatarStatus,
        headerStatus: headerImage ? 'pending' : result.user.headerStatus,
      });
      setProfileUser({
        ...result.user,
        avatarStatus: avatarImage ? 'pending' : result.user.avatarStatus,
        headerStatus: headerImage ? 'pending' : result.user.headerStatus,
      });
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
          go={go}
          onLogin={() => setModal({ kind: 'auth', mode: 'login' })}
        />
        <div className="community-main">
          <header className="community-topbar">
            <div>
              <strong>{pageTitle}</strong>
              <small>CAMPUS COMMUNITY</small>
            </div>
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
              ja={ja}
              setQuery={setQuery}
              setTag={setTag}
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
              ja={ja}
              setQuery={setQuery}
              setTag={setTag}
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
            />
          ) : null}
        </div>
        <MobileNav page={page} ja={ja} go={go} />
        <ModalLayer
          modal={modal}
          user={user}
          ja={ja}
          busy={busy}
          error={error}
          defaultAuthorName={defaultAuthorName}
          postImage={postImage}
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
          openTag={openTag}
          openProfile={(loginId) => void openProfile(loginId)}
          readPost={(file) => readFile(file, 6 * 1048576, setPostImage)}
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
  go,
  onLogin,
}: {
  page: CommunityPage;
  user: CommunityUser | null;
  ja: boolean;
  go: (page: CommunityPage) => void;
  onLogin: () => void;
}) {
  return (
    <aside className="community-sidebar">
      <button className="community-brand" onClick={() => go('home')}>
        <img src={browser.runtime.getURL('community/activity-icon.png')} alt="" />
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
  onClick,
}: {
  active: boolean;
  icon: 'home' | 'search' | 'user' | 'heart';
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? 'is-active' : ''} onClick={onClick}>
      <Glyph name={icon} />
      <span>{label}</span>
    </button>
  );
}

function MobileNav({
  page,
  ja,
  go,
}: {
  page: CommunityPage;
  ja: boolean;
  go: (page: CommunityPage) => void;
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
      <button onClick={() => go('create')}>
        <Glyph name="plus" />
        <span>{ja ? '投稿' : 'Post'}</span>
      </button>
      <NavButton
        active={page === 'profile'}
        icon="user"
        label={ja ? '自分' : 'Profile'}
        onClick={() => go('profile')}
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
        <header className="community-screen-heading">
          <div>
            <h1>{ja ? '新着の活動' : 'Latest activities'}</h1>
            <p>
              {ja
                ? 'キャンパスのみんなが共有した作品や活動です。'
                : 'Projects and activities shared around campus.'}
            </p>
          </div>
          <button onClick={onCreate}>
            <Glyph name="plus" />
            {ja ? '投稿する' : 'Create'}
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
          <>
            <div className="community-grid is-home">
              {posts.slice(0, 9).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
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
          </>
        ) : (
          <Empty ja={ja} action={onCreate} />
        )}
      </div>
    </main>
  );
}

function ExploreScreen({
  posts,
  loading,
  query,
  tag,
  tags,
  ja,
  title,
  description,
  setQuery,
  setTag,
  onOpen,
  onLike,
}: {
  posts: CommunityPost[];
  loading: boolean;
  query: string;
  tag: string;
  tags: string[];
  ja: boolean;
  title?: string;
  description?: string;
  setQuery: (value: string) => void;
  setTag: (value: string) => void;
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
            placeholder={ja ? '投稿を検索' : 'Search posts'}
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
        {loading ? (
          <Empty ja={ja} loading />
        ) : posts.length ? (
          <div className="community-grid">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
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
  onOpen,
  onLike,
}: {
  post: CommunityPost;
  onOpen: () => void;
  onLike: () => void;
}) {
  const like = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onLike();
  };
  const visibleTags = post.tags.slice(0, 3);
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
        <div className="community-post-shade" />
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
        <div className="community-post-body">
          <h2>{post.title}</h2>
          <p>
            <Avatar name={post.authorName} url={post.authorAvatarUrl} />
            <span>{post.authorName}</span>
          </p>
        </div>
      </div>
    </article>
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
              <div>
                <h1>{user.displayName}</h1>
                <span>@{user.loginId}</span>
              </div>
              <p>{user.bio || (ja ? '自己紹介はまだありません。' : 'No bio yet.')}</p>
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
          {isOwn &&
          (user.displayNameStatus === 'pending' ||
            user.avatarStatus === 'pending' ||
            user.headerStatus === 'pending') ? (
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
                <PostCard post={post} onOpen={() => onOpen(post)} onLike={() => onLike(post)} />
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
  user: CommunityUser | null;
  ja: boolean;
  busy: boolean;
  error: string;
  defaultAuthorName: string;
  postImage: string;
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
  openTag: (tag: string) => void;
  openProfile: (loginId: string) => void;
  toggleLike: (post: CommunityPost) => void;
  readPost: (file?: File) => void;
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
          onDelete={
            user && modal.post.authorLoginId === user.loginId
              ? () => props.requestDelete(modal.post)
              : undefined
          }
          onTagClick={props.openTag}
          onAuthorClick={
            modal.post.authorLoginId
              ? () => props.openProfile(modal.post.authorLoginId as string)
              : undefined
          }
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
          <img src={browser.runtime.getURL('community/activity-icon.png')} alt="" />
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
        <button className="community-submit" disabled={busy}>
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
  const { ja, busy, error, close, postImage, readPost, submitPost, suggestedTags, user } = props;
  const imageInput = useRef<HTMLInputElement>(null);
  const captionInput = useRef<HTMLTextAreaElement>(null);
  const [caption, setCaption] = useState('');
  const [tagSearch, setTagSearch] = useState<string | null>(null);
  const [activeTagIndex, setActiveTagIndex] = useState(0);

  const matchingTags = useMemo(() => {
    if (tagSearch === null) return [];
    const needle = tagSearch.toLocaleLowerCase();
    return suggestedTags
      .filter((tag) => !needle || tag.toLocaleLowerCase().includes(needle))
      .slice(0, 6);
  }, [suggestedTags, tagSearch]);

  const updateTagSearch = (value: string, caret: number | null) => {
    const beforeCaret = value.slice(0, caret ?? value.length);
    const match = beforeCaret.match(
      /(?:^|\s)#([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]*)$/u,
    );
    setActiveTagIndex(0);
    setTagSearch(match ? match[1] : null);
  };

  const insertTag = (tag: string) => {
    const textarea = captionInput.current;
    if (!textarea) return;
    const caret = textarea.selectionStart ?? caption.length;
    const beforeCaret = caption.slice(0, caret);
    const match = beforeCaret.match(
      /(?:^|\s)#([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]*)$/u,
    );
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

  const choosePhoto = () => {
    if (!imageInput.current) return;
    imageInput.current.value = '';
    imageInput.current.click();
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
        <section className={`community-image-picker${postImage ? ' has-image' : ''}`}>
          {postImage ? (
            <img src={postImage} alt="" />
          ) : (
            <div className="community-image-picker-empty">
              <Glyph name="image" />
              <strong>{ja ? '投稿する写真を追加' : 'Add a photo'}</strong>
              <span>{ja ? '写真は1枚まで投稿できます' : 'You can add one photo'}</span>
              <small>JPEG / PNG / WebP · 6MB</small>
            </div>
          )}
          <button type="button" onClick={choosePhoto}>
            {postImage ? (ja ? '写真を変更' : 'Change photo') : ja ? '写真を選択' : 'Choose photo'}
          </button>
          <input
            ref={imageInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              readPost(event.currentTarget.files?.[0]);
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
        <button className="is-primary" disabled={busy || !postImage}>
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
  onDelete,
  onTagClick,
  onAuthorClick,
}: {
  post: CommunityPost;
  ja: boolean;
  close: () => void;
  toggleLike: (post: CommunityPost) => void;
  onDelete?: () => void;
  onTagClick: (tag: string) => void;
  onAuthorClick?: () => void;
}) {
  return (
    <article className="community-post-dialog">
      <header className="community-post-viewer-head">
        <button
          className="community-post-author"
          type="button"
          onClick={onAuthorClick}
          disabled={!onAuthorClick}
          aria-label={onAuthorClick ? `${post.authorName}のプロフィールを開く` : undefined}
        >
          <Avatar name={post.authorName} url={post.authorAvatarUrl} />
          <div>
            <strong>{post.authorName}</strong>
            <time>{new Date(post.createdAt).toLocaleDateString(ja ? 'ja-JP' : 'en-US')}</time>
          </div>
        </button>
        <div className="community-post-header-actions">
          {onDelete ? (
            <button className="community-post-delete" type="button" onClick={onDelete}>
              {ja ? '削除' : 'Delete'}
            </button>
          ) : null}
          <button
            className="community-post-close"
            onClick={close}
            aria-label={ja ? '閉じる' : 'Close'}
          >
            <Glyph name="close" />
          </button>
        </div>
      </header>

      <div className="community-post-viewer-image">
        <img src={post.previewUrl || post.imageUrl} alt="" />
      </div>

      <section className="community-post-viewer-panel">
        <div className="community-post-copy">
          <h2>{post.title}</h2>
        </div>
        <div className="community-post-actions">
          <button
            className={`community-detail-like${post.likedByMe ? ' is-active' : ''}`}
            type="button"
            onClick={() => toggleLike(post)}
          >
            <Glyph name="heart" />
            <span>{post.likeCount}</span>
            {ja ? 'いいね' : 'Like'}
          </button>
        </div>
        <p>{renderCaptionWithTags(post.caption, onTagClick)}</p>
        {post.rejectionReason ? (
          <aside>
            <strong>{ja ? '非公開の理由' : 'Reason'}</strong>
            {post.rejectionReason}
          </aside>
        ) : null}
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

function renderCaptionWithTags(caption: string, onTagClick: (tag: string) => void): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tagPattern = /#([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]{1,30})/gu;
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
    avatarImage,
    headerImage,
    readAvatar,
    readHeader,
    saveProfile,
    close,
  } = props;
  const avatarInput = useRef<HTMLInputElement>(null);
  const headerInput = useRef<HTMLInputElement>(null);

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
      <div className="community-profile-editor-media">
        <div className="community-profile-editor-header">
          {headerImage || user.headerUrl ? (
            <img src={headerImage || user.headerUrl} alt="" />
          ) : (
            <div className="community-profile-editor-header-empty" aria-hidden="true" />
          )}
          <button
            type="button"
            disabled={user.headerStatus === 'pending'}
            onClick={() => chooseImage(headerInput.current)}
          >
            {user.headerStatus === 'pending'
              ? ja
                ? 'ヘッダー画像を審査中'
                : 'Header under review'
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
            <strong>{user.pendingDisplayName || user.displayName}</strong>
            <small>@{user.loginId}</small>
          </div>
          <button
            type="button"
            disabled={user.avatarStatus === 'pending'}
            onClick={() => chooseImage(avatarInput.current)}
          >
            {user.avatarStatus === 'pending'
              ? ja
                ? 'アイコンを審査中'
                : 'Avatar under review'
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
      <p className="community-help">
        {ja
          ? 'アイコンは2MB、ヘッダー画像は5MBまで。画像の変更は審査後に公開されます。'
          : 'Avatar up to 2MB, header up to 5MB. Image changes appear after review.'}
      </p>
      <div className="community-profile-editor-fields">
        <Field label={ja ? '表示名' : 'Display name'}>
          <input
            name="displayName"
            defaultValue={user.pendingDisplayName || user.displayName}
            readOnly={user.displayNameStatus === 'pending'}
            maxLength={40}
            required
          />
        </Field>
        {user.displayNameStatus === 'pending' ? (
          <p className="community-help">
            {ja ? '表示名の変更を審査中です。' : 'Name change is under review.'}
          </p>
        ) : null}
        <Field label={ja ? '自己紹介' : 'Bio'}>
          <textarea name="bio" defaultValue={user.bio} maxLength={160} rows={4} />
        </Field>
      </div>
      <ErrorMessage text={error} />
      <footer>
        <button type="button" onClick={close}>
          {ja ? 'キャンセル' : 'Cancel'}
        </button>
        <button className="is-primary" disabled={busy}>
          {busy ? <Busy /> : null}
          {ja ? '保存' : 'Save'}
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
