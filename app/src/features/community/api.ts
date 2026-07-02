import { COMMUNITY_API_ORIGIN } from '../../shared/constants';
import type { CommunityPost, CommunityUser } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${COMMUNITY_API_ORIGIN}${path}`, { cache: 'no-store', ...init });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

const authorized = (token: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...init.headers, authorization: `Bearer ${token}` },
});

export const communityApi = {
  posts: (token?: string) =>
    request<{ posts: CommunityPost[] }>(
      '/api/posts?limit=30',
      token ? authorized(token) : undefined,
    ),
  session: (token: string) => request<{ user: CommunityUser }>('/api/auth/me', authorized(token)),
  authenticate: (mode: 'register' | 'login', body: object) =>
    request<{ token: string; user: CommunityUser }>(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  logout: (token: string) => request('/api/auth/logout', authorized(token, { method: 'POST' })),
  ownPosts: (token: string) =>
    request<{ posts: CommunityPost[] }>('/api/me/posts', authorized(token)),
  followingPosts: (token: string) =>
    request<{ posts: CommunityPost[] }>('/api/me/following/posts', authorized(token)),
  user: (loginId: string, token?: string) =>
    request<{ user: CommunityUser }>(
      `/api/users/${encodeURIComponent(loginId)}`,
      token ? authorized(token) : undefined,
    ),
  userPosts: (loginId: string, token?: string) =>
    request<{ posts: CommunityPost[] }>(
      `/api/users/${encodeURIComponent(loginId)}/posts`,
      token ? authorized(token) : undefined,
    ),
  followers: (loginId: string, token?: string) =>
    request<{ users: CommunityUser[] }>(
      `/api/users/${encodeURIComponent(loginId)}/followers`,
      token ? authorized(token) : undefined,
    ),
  following: (loginId: string, token?: string) =>
    request<{ users: CommunityUser[] }>(
      `/api/users/${encodeURIComponent(loginId)}/following`,
      token ? authorized(token) : undefined,
    ),
  ownPostImage: async (token: string, id: string) => {
    const response = await fetch(
      `${COMMUNITY_API_ORIGIN}/api/me/posts/${encodeURIComponent(id)}/image`,
      authorized(token),
    );
    if (!response.ok) throw new Error('画像を読み込めませんでした');
    return URL.createObjectURL(await response.blob());
  },
  createPost: (token: string, body: object) =>
    request<{ id: string }>(
      '/api/posts',
      authorized(token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    ),
  deletePost: (token: string, id: string) =>
    request(`/api/me/posts/${encodeURIComponent(id)}`, authorized(token, { method: 'DELETE' })),
  likePost: (token: string, id: string) =>
    request<{ likedByMe: boolean; likeCount: number }>(
      `/api/posts/${encodeURIComponent(id)}/like`,
      authorized(token, { method: 'POST' }),
    ),
  unlikePost: (token: string, id: string) =>
    request<{ likedByMe: boolean; likeCount: number }>(
      `/api/posts/${encodeURIComponent(id)}/like`,
      authorized(token, { method: 'DELETE' }),
    ),
  followUser: (token: string, loginId: string) =>
    request<{ followerCount: number; followingCount: number; followedByMe: boolean }>(
      `/api/users/${encodeURIComponent(loginId)}/follow`,
      authorized(token, { method: 'POST' }),
    ),
  unfollowUser: (token: string, loginId: string) =>
    request<{ followerCount: number; followingCount: number; followedByMe: boolean }>(
      `/api/users/${encodeURIComponent(loginId)}/follow`,
      authorized(token, { method: 'DELETE' }),
    ),
  updateProfile: (token: string, body: object) =>
    request<{ user: CommunityUser }>(
      '/api/me/profile',
      authorized(token, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    ),
  submitAvatar: (token: string, imageDataUrl: string) =>
    request<{ id: string; status: 'pending' }>(
      '/api/me/avatar',
      authorized(token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
      }),
    ),
  submitHeader: (token: string, imageDataUrl: string) =>
    request<{ id: string; status: 'pending' }>(
      '/api/me/header',
      authorized(token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
      }),
    ),
};
