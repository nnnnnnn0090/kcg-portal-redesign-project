import { useCallback, useEffect, useRef, useState, type AnimationEvent, type SetStateAction } from 'react';
import { communityApi } from '../../../services/community-api';
import { resolveCommunityMediaUrls } from '../../../services/community-media-urls';
import { getCommunityApiOrigin } from '../../../services/community-runtime';
import {
  connectCommunityStreaming,
  type CommunityStreamStatus,
} from '../../../services/community-stream';
import type { CommunityNotification, CommunityPost } from '../types';
import { filterPosts } from '../utils';
import type { CommunityAction, CommunityPage } from './types';

const NOTIFICATION_TOAST_MS = 4_500;

function shouldPrependPost(
  post: CommunityPost,
  page: CommunityPage,
  query: string,
  tag: string,
): boolean {
  if (page === 'home') return true;
  if (page === 'explore') return filterPosts([post], query, tag).length > 0;
  return false;
}

export function useCommunityTimelineStream(options: {
  token: string;
  page: CommunityPage;
  query: string;
  tag: string;
  notifications: CommunityNotification[];
  dispatch: (action: CommunityAction) => void;
  loadNotifications: (authToken: string) => Promise<void>;
  loadFollowing: (authToken: string) => Promise<void>;
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
  const toastTimerRef = useRef<number | undefined>();
  const toastGapTimerRef = useRef<number | undefined>();
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
        if (shouldPrependPost(normalized, current.page, current.query, current.tag)) {
          current.dispatch({ type: 'prependPost', post: normalized });
        }
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
      onPostRemoved: (postId) => {
        optionsRef.current.dispatch({ type: 'removePost', postId });
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
            if (baseline === null) return;
            const fresh = result.notifications.filter((item) => !baseline.has(item.id));
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
