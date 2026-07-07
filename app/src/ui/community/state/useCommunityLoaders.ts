import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { communityApi } from '../api';
import type { CommunityNotification, CommunityPost, CommunityUser } from '../types';
import { mergeOwnProfile } from '../utils';

type Setter<T> = Dispatch<SetStateAction<T>>;

interface CommunityLoaderOptions {
  ja: boolean;
  objectUrls: MutableRefObject<string[]>;
  profileObjectUrls: MutableRefObject<string[]>;
  setPosts: Setter<CommunityPost[]>;
  setOwnPosts: Setter<CommunityPost[]>;
  setFollowingPosts: Setter<CommunityPost[]>;
  setBookmarkedPosts: Setter<CommunityPost[]>;
  setKnownTags: Setter<string[]>;
  setNotifications: Setter<CommunityNotification[]>;
  setUnreadCount: Setter<number>;
  setProfileUser: Setter<CommunityUser | null>;
  setProfilePosts: Setter<CommunityPost[]>;
  setUser: Setter<CommunityUser | null>;
  setLoading: Setter<boolean>;
  setError: Setter<string>;
}

export function useCommunityLoaders({
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
}: CommunityLoaderOptions) {
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
                  communityApi.ownPostImage(authToken, post.id, index),
                ),
              );
              return { ...post, previewUrl: imageUrls[0], imageUrls };
            } catch {
              return post;
            }
          }),
        );
        objectUrls.current = hydrated.flatMap((post) => (post.previewUrl ? post.imageUrls : []));
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
        // An unset image keeps its public URL or placeholder.
      }
      try {
        const headerUrl = await communityApi.ownProfileImage(authToken, 'header');
        next.headerUrl = headerUrl;
        urls.push(headerUrl);
      } catch {
        // An unset image keeps its public URL or empty state.
      }
      profileObjectUrls.current.forEach(URL.revokeObjectURL);
      profileObjectUrls.current = urls;
      return next;
    },
    [profileObjectUrls],
  );

  const refreshOwnProfile = useCallback(
    async (loginId: string, authToken: string) => {
      const [session, profile, refreshedPosts] = await Promise.all([
        communityApi.session(authToken),
        communityApi.user(loginId, authToken),
        loadOwn(authToken),
      ]);
      const refreshedUser = await hydrateOwnProfileImages(
        mergeOwnProfile(session.user, profile.user),
        authToken,
      );
      setUser(refreshedUser);
      setProfileUser(refreshedUser);
      setProfilePosts(refreshedPosts);
      return refreshedUser;
    },
    [hydrateOwnProfileImages, loadOwn, setProfilePosts, setProfileUser, setUser],
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

  return {
    loadFeed,
    loadOwn,
    loadFollowing,
    loadBookmarks,
    hydrateOwnProfileImages,
    refreshOwnProfile,
    loadNotifications,
    loadKnownTags,
  };
}
