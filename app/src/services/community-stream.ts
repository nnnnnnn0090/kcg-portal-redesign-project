import type { CommunityPost } from '../ui/community/types';
import { getCommunityApiOrigin } from './community-runtime';

const RETRY_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;

export type CommunityStreamingHandlers = {
  onNote: (post: CommunityPost) => void;
  onPostRemoved: (postId: string) => void;
  onPostStats: (payload: {
    postId: string;
    likeCount?: number;
    bookmarkCount?: number;
    commentCount?: number;
    impressionCount?: number;
  }) => void;
  onNotificationFlushed: () => void;
  onStatusChange?: (status: CommunityStreamStatus) => void;
  onOpen?: () => void;
};

export type CommunityStreamStatus = 'connected' | 'disconnected' | 'connecting';

export type CommunityStreamingConnection = {
  disconnect: () => void;
  reconnect: () => void;
};

function streamingUrl(origin: string, token?: string): string {
  const url = new URL(origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/streaming';
  url.search = '';
  if (token) url.searchParams.set('i', token);
  return url.toString();
}

function connectChannel(ws: WebSocket, channel: 'homeTimeline' | 'main', id: string) {
  ws.send(
    JSON.stringify({
      type: 'connect',
      body: {
        channel,
        id,
        params: channel === 'homeTimeline' ? {} : null,
      },
    }),
  );
}

export function connectCommunityStreaming(
  options: CommunityStreamingHandlers & { token?: string },
): CommunityStreamingConnection {
  let ws: WebSocket | null = null;
  let closed = false;
  let retryTimer: number | undefined;
  let retryIndex = 0;

  const setStatus = (status: CommunityStreamStatus) => {
    options.onStatusChange?.(status);
  };

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = RETRY_MS[Math.min(retryIndex, RETRY_MS.length - 1)];
    retryIndex += 1;
    retryTimer = window.setTimeout(() => {
      connect();
    }, delay);
  };

  const connect = () => {
    if (closed) return;
    const origin = getCommunityApiOrigin();
    if (!origin) {
      setStatus('disconnected');
      scheduleReconnect();
      return;
    }

    setStatus('connecting');
    ws = new WebSocket(streamingUrl(origin, options.token));
    ws.onopen = () => {
      retryIndex = 0;
      connectChannel(ws!, 'homeTimeline', 'home');
      if (options.token) connectChannel(ws!, 'main', 'main');
      setStatus('connected');
      options.onOpen?.();
    };
    ws.onmessage = (event) => {
      let message: { type?: string; body?: { type?: string; body?: unknown } };
      try {
        message = JSON.parse(String(event.data)) as {
          type?: string;
          body?: { type?: string; body?: unknown };
        };
      } catch {
        return;
      }
      if (message.type !== 'channel' || !message.body?.type) return;
      const payload = message.body.body;
      switch (message.body.type) {
        case 'note':
          if (payload && typeof payload === 'object') {
            options.onNote(payload as CommunityPost);
          }
          return;
        case 'postRemoved':
          if (
            payload &&
            typeof payload === 'object' &&
            typeof (payload as { postId?: unknown }).postId === 'string'
          ) {
            options.onPostRemoved((payload as { postId: string }).postId);
          }
          return;
        case 'postStats':
          if (payload && typeof payload === 'object' && 'postId' in payload) {
            options.onPostStats(payload as {
              postId: string;
              likeCount?: number;
              bookmarkCount?: number;
              commentCount?: number;
              impressionCount?: number;
            });
          }
          return;
        case 'notificationFlushed':
          options.onNotificationFlushed();
          return;
        default:
          return;
      }
    };
    ws.onclose = () => {
      ws = null;
      if (!closed) {
        setStatus('disconnected');
        scheduleReconnect();
      }
    };
    ws.onerror = () => ws?.close();
  };

  const reconnect = () => {
    if (closed) return;
    if (retryTimer) window.clearTimeout(retryTimer);
    retryIndex = 0;
    ws?.close();
    connect();
  };

  connect();

  return {
    disconnect: () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      ws?.close();
    },
    reconnect,
  };
}
