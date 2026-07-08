import { useCallback, useEffect, useRef, useState, type AnimationEvent, type SetStateAction } from 'react';
import { communityApi } from '../../../services/community-api';
import { resolveCommunityMediaUrls } from '../../../services/community-media-urls';
import { getCommunityApiOrigin } from '../../../services/community-runtime';
import {
  connectCommunityStreaming,
  type CommunityStreamStatus,
} from '../../../services/community-stream';
import type { CommunityNotification, CommunityPage, CommunityPost, CommunityUser } from '../types';
import type { CommunityAction } from './types';

const NOTIFICATION_TOAST_MS = 4_500;

function stripViewerFlags(post: CommunityPost): Partial<CommunityPost> {
  const {
    likedByMe: _likedByMe,
    bookmarkedByMe: _bookmarkedByMe,
    previewUrl: _previewUrl,
    ...rest
  } = post;
  return rest;
}

export function useCommunityTimelineStream(options: {
  token: string;
  page: CommunityPage;
  query: string;
  tag: string;
  openPostId?: string;
  notifications: CommunityNotification[];
  dispatch: (action: CommunityAction) => void;
  loadNotifications: (authToken: string) => Promise<void>;
  loadFollowing: (authToken: string) => Promise<void>;
  loadOwn?: (authToken: string) => Promise<unknown>;
  refreshOwnProfile?: (loginId: string, authToken: string) => Promise<unknown>;
  loadBookmarks?: (authToken: string) => Promise<void>;
  onSessionRevoked?: () => void;
  setKnownTags: (value: SetStateAction<string[]>) => void;
}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [streamStatus, setStreamStatus] = useState<CommunityStreamStatus>('connecting');
  const [notificationToast, setNotificationToast] = useState<CommunityNotification | null>(null);
  const [notificationToastClosing, setNotificationToastClosing] = useState(false);
  const streamControlRef = useRef<{ reconnect: () => void }>({ reconnect: () => {} });
  const notificationBaselineRef = useRef<Set<string> | null>(null);
  const toastQueueRef = useRef<CommunityNotification[]>([]);
  const toastTimerRef = useRef<number | undefined>(undefined);
  const toastGapTimerRef = useRef<number | undefined>(undefined);
  const activeToastRef = useRef(false);

  const clearToastTimers = useCallback(() => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    if (toastGapTimerRef.current) window.clearTimeout(toastGapTimerRef.current);
    toastTimerRef.current = undefined;
    toastGapTimerRef.current = undefined;
  }, []);

  const showNextNotificationToast = useCallback(() => {
    if (activeToastRef.current) return;
    const next = toastQueueRef.current.shift();
    if (!next) return;
    activeToastRef.current = true;
    setNotificationToast(next);
    setNotificationToastClosing(false);
    toastTimerRef.current = window.setTimeout(() => {
      setNotificationToastClosing(true);
    }, NOTIFICATION_TOAST_MS);
  }, []);

  const enqueueNotificationToasts = useCallback(
    (items: CommunityNotification[]) => {
      if (!items.length) return;
      toastQueueRef.current.push(...items);
      showNextNotificationToast();
    },
    [showNextNotificationToast],
  );

  const dismissNotificationToast = useCallback(() => {
    clearToastTimers();
    setNotificationToastClosing(true);
  }, [clearToastTimers]);

  const handleNotificationToastAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLDivElement>) => {
      if (!event.animationName.includes('community-toast-out-right')) return;
      activeToastRef.current = false;
      setNotificationToast(null);
      setNotificationToastClosing(false);
      toastGapTimerRef.current = window.setTimeout(showNextNotificationToast, 180);
    },
    [showNextNotificationToast],
  );

  useEffect(() => {
    if (notificationBaselineRef.current !== null) return;
    notificationBaselineRef.current = new Set(options.notifications.map((item) => item.id));
  }, [options.notifications]);

  useEffect(() => {
    notificationBaselineRef.current = null;
    toastQueueRef.current = [];
    activeToastRef.current = false;
    clearToastTimers();
    setNotificationToast(null);
    setNotificationToastClosing(false);
  }, [clearToastTimers, options.token]);

  useEffect(() => {
    const connection = connectCommunityStreaming({
      token: optionsRef.current.token || undefined,
      onStatusChange: setStreamStatus,
      onNote: (post) => {
        const current = optionsRef.current;
        const normalized = resolveCommunityMediaUrls(post, getCommunityApiOrigin());
        current.dispatch({ type: 'prependPost', post: normalized });
        if (normalized.tags.length) {
          current.setKnownTags((tags) => {
            const next = new Set(tags);
            for (const tag of normalized.tags) next.add(tag);
            return Array.from(next);
          });
        }
        if (current.token && current.page === 'following') {
          void current.loadFollowing(current.token);
        }
      },
      onPostUpdated: (post) => {
        const normalized = resolveCommunityMediaUrls(post, getCommunityApiOrigin());
        optionsRef.current.dispatch({
          type: 'patchPost',
          postId: normalized.id,
          value: stripViewerFlags(normalized),
        });
      },
      onPostRemoved: (postId) => {
        const current = optionsRef.current;
        current.dispatch({ type: 'removePost', postId });
        if (current.token && current.loadOwn) void current.loadOwn(current.token);
      },
      onPostStats: (payload) => {
        optionsRef.current.dispatch({
          type: 'patchPost',
          postId: payload.postId,
          value: {
            ...(payload.likeCount !== undefined ? { likeCount: payload.likeCount } : {}),
            ...(payload.bookmarkCount !== undefined ? { bookmarkCount: payload.bookmarkCount } : {}),
            ...(payload.commentCount !== undefined ? { commentCount: payload.commentCount } : {}),
            ...(payload.impressionCount !== undefined
              ? { impressionCount: payload.impressionCount }
              : {}),
          },
        });
        if (
          payload.bookmarkCount !== undefined &&
          optionsRef.current.token &&
          optionsRef.current.page === 'bookmarks' &&
          optionsRef.current.loadBookmarks
        ) {
          void optionsRef.current.loadBookmarks(optionsRef.current.token);
        }
      },
      onCommentsChanged: (postId) => {
        const current = optionsRef.current;
        if (current.openPostId === postId) {
          current.dispatch({ type: 'bumpCommentsRevision' });
        }
      },
      onProfileUpdated: (user) => {
        const normalized = resolveCommunityMediaUrls(user, getCommunityApiOrigin()) as CommunityUser;
        optionsRef.current.dispatch({ type: 'profileUpdated', user: normalized });
      },
      onFollowUpdated: (payload) => {
        const current = optionsRef.current;
        current.dispatch({ type: 'followUpdated', ...payload });
        if (current.token && current.page === 'following') {
          void current.loadFollowing(current.token);
        }
      },
      onSessionRevoked: () => {
        optionsRef.current.onSessionRevoked?.();
      },
      onNotificationFlushed: () => {
        void (async () => {
          const current = optionsRef.current;
          if (!current.token) return;
          try {
            const result = await communityApi.notifications(current.token);
            const baseline = notificationBaselineRef.current;
            notificationBaselineRef.current = new Set(result.notifications.map((item) => item.id));
            current.dispatch({
              type: 'patch',
              value: {
                notifications: result.notifications,
                unreadCount: result.unreadCount,
              },
            });
            const fresh = baseline
              ? result.notifications.filter((item) => !baseline.has(item.id))
              : [];
            const needsOwnRefresh = fresh.some((item) =>
              [
                'post_approved',
                'post_rejected',
                'comment_approved',
                'comment_rejected',
                'profile_approved',
                'profile_rejected',
              ].includes(item.type),
            );
            if (needsOwnRefresh && current.loadOwn) {
              await current.loadOwn(current.token);
            }
            const profileFresh = fresh.some((item) => item.type.startsWith('profile_'));
            if (profileFresh && current.refreshOwnProfile) {
              try {
                const session = await communityApi.session(current.token);
                await current.refreshOwnProfile(session.user.loginId, current.token);
              } catch {
                // Session may already be invalid; ignore.
              }
            }
            if (baseline === null) return;
            if (current.page !== 'notifications' && fresh.length) {
              enqueueNotificationToasts(fresh);
            }
          } catch {
            await current.loadNotifications(current.token);
          }
        })();
      },
    });

    streamControlRef.current = connection;
    return () => {
      connection.disconnect();
      clearToastTimers();
    };
  }, [clearToastTimers, enqueueNotificationToasts, options.token]);

  const reconnectStream = useCallback(() => {
    streamControlRef.current.reconnect();
  }, []);

  return {
    streamDisconnected: streamStatus === 'disconnected',
    streamConnecting: streamStatus === 'connecting',
    reconnectStream,
    notificationToast,
    notificationToastClosing,
    dismissNotificationToast,
    handleNotificationToastAnimationEnd,
  };
}
