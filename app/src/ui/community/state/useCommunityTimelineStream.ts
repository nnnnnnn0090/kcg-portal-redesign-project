import { useEffect, useRef, type SetStateAction } from 'react';
import { connectCommunityStreaming } from '../../../services/community-stream';
import type { CommunityPost } from '../types';
import { filterPosts } from '../utils';
import type { CommunityAction, CommunityPage } from './types';

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
  dispatch: (action: CommunityAction) => void;
  loadNotifications: (authToken: string) => Promise<void>;
  loadFollowing: (authToken: string) => Promise<void>;
  setKnownTags: (value: SetStateAction<string[]>) => void;
}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const disconnect = connectCommunityStreaming({
      token: optionsRef.current.token || undefined,
      onNote: (post) => {
        const current = optionsRef.current;
        if (shouldPrependPost(post, current.page, current.query, current.tag)) {
          current.dispatch({ type: 'prependPost', post });
        }
        if (post.tags.length) {
          current.setKnownTags((tags) => {
            const next = new Set(tags);
            for (const tag of post.tags) next.add(tag);
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
        const current = optionsRef.current;
        if (current.token) void current.loadNotifications(current.token);
      },
    });

    return disconnect;
  }, [options.token]);
}
