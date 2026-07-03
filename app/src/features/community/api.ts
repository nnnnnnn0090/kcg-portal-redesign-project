import { COMMUNITY_API_ORIGIN } from '../../shared/constants';
import type { ApiResponse, CommunityComment, CommunityNotification, CommunityPost, CommunityUser } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${COMMUNITY_API_ORIGIN}/api/v1${path}`, { cache: 'no-store', ...init });
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) throw new Error(`HTTP ${response.status}`);
  if (!body.ok) throw new Error(body.error.message);
  return resolveApiUrls(body.data);
}
function resolveApiUrls<T>(value: T): T {
  if (typeof value === 'string') return (value.startsWith('/api/') ? `${COMMUNITY_API_ORIGIN}${value}` : value) as T;
  if (Array.isArray(value)) return value.map(resolveApiUrls) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveApiUrls(item)])) as T;
  return value;
}
const authorized = (token: string, init: RequestInit = {}): RequestInit => ({ ...init, headers: { ...init.headers, authorization: `Bearer ${token}` } });
const json = (method: string, body?: object): RequestInit => ({ method, headers: { 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });

export const communityApi = {
  posts: (token?: string) => request<{ posts: CommunityPost[] }>('/posts', token ? authorized(token) : undefined),
  session: (token: string) => request<{ user: CommunityUser }>('/session', authorized(token)),
  authenticate: (mode: 'register' | 'login', body: object) => request<{ token: string; user: CommunityUser }>(`/auth/${mode}`, json('POST', body)),
  logout: (token: string) => request<null>('/session', authorized(token, { method: 'DELETE' })),
  ownPosts: (token: string) => request<{ posts: CommunityPost[] }>('/me/posts', authorized(token)),
  followingPosts: (token: string) => request<{ posts: CommunityPost[] }>('/following/posts', authorized(token)),
  user: (loginId: string, token?: string) => request<{ user: CommunityUser }>(`/users/${encodeURIComponent(loginId)}`, token ? authorized(token) : undefined),
  userPosts: (loginId: string, token?: string) => request<{ posts: CommunityPost[] }>(`/users/${encodeURIComponent(loginId)}/posts`, token ? authorized(token) : undefined),
  ownPostImage: async (token: string, id: string, position = 0) => {
    const response = await fetch(`${COMMUNITY_API_ORIGIN}/api/v1/posts/${encodeURIComponent(id)}/images/${position}`, authorized(token));
    if (!response.ok) throw new Error('画像を読み込めませんでした');
    return URL.createObjectURL(await response.blob());
  },
  ownProfileImage: async (token: string, kind: 'avatar' | 'header') => {
    const response = await fetch(`${COMMUNITY_API_ORIGIN}/api/v1/profile/${kind}`, authorized(token));
    if (!response.ok) throw new Error('画像を読み込めませんでした');
    return URL.createObjectURL(await response.blob());
  },
  followers: (loginId: string, token?: string) => request<{ users: CommunityUser[] }>(`/users/${encodeURIComponent(loginId)}/followers`, token ? authorized(token) : undefined),
  following: (loginId: string, token?: string) => request<{ users: CommunityUser[] }>(`/users/${encodeURIComponent(loginId)}/following`, token ? authorized(token) : undefined),
  searchUsers: (query: string, token?: string) => request<{ users: CommunityUser[] }>(`/users?q=${encodeURIComponent(query)}`, token ? authorized(token) : undefined),
  tags: () => request<{ tags: string[] }>('/tags'),
  createPost: (token: string, body: object) => request<{ id: string; status: 'pending' }>('/posts', authorized(token, json('POST', body))),
  updatePost: (token: string, id: string, body: object) => request<{ post: CommunityPost }>(`/posts/${encodeURIComponent(id)}`, authorized(token, json('PATCH', body))),
  deletePost: (token: string, id: string) => request<null>(`/posts/${encodeURIComponent(id)}`, authorized(token, { method: 'DELETE' })),
  likePost: (token: string, id: string) => request<{ likedByMe: boolean; likeCount: number }>(`/posts/${encodeURIComponent(id)}/likes`, authorized(token, { method: 'POST' })),
  unlikePost: (token: string, id: string) => request<{ likedByMe: boolean; likeCount: number }>(`/posts/${encodeURIComponent(id)}/likes`, authorized(token, { method: 'DELETE' })),
  postLikes: (id: string, token?: string) => request<{ users: CommunityUser[] }>(`/posts/${encodeURIComponent(id)}/likes`, token ? authorized(token) : undefined),
  postComments: (id: string, token?: string) => request<{ comments: CommunityComment[] }>(`/posts/${encodeURIComponent(id)}/comments`, token ? authorized(token) : undefined),
  createComment: (token: string, id: string, content: string) => request<{ comment: CommunityComment }>(`/posts/${encodeURIComponent(id)}/comments`, authorized(token, json('POST', { content }))),
  deleteComment: (token: string, postId: string, commentId: string) => request<null>(`/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, authorized(token, { method: 'DELETE' })),
  report: (token: string, targetType: 'post' | 'comment' | 'profile', targetId: string, reason: string) => request<{ status: string }>('/reports', authorized(token, json('POST', { targetType, targetId, reason }))),
  notifications: (token: string) => request<{ notifications: CommunityNotification[]; unreadCount: number }>('/notifications', authorized(token)),
  readNotifications: (token: string) => request<{ unreadCount: number }>('/notifications/read', authorized(token, { method: 'POST' })),
  followUser: (token: string, loginId: string) => request<{ followerCount: number; followingCount: number; followedByMe: boolean }>(`/users/${encodeURIComponent(loginId)}/followers`, authorized(token, { method: 'POST' })),
  unfollowUser: (token: string, loginId: string) => request<{ followerCount: number; followingCount: number; followedByMe: boolean }>(`/users/${encodeURIComponent(loginId)}/followers`, authorized(token, { method: 'DELETE' })),
  updateProfile: (token: string, body: object) => request<{ user: CommunityUser }>('/profile', authorized(token, json('PATCH', body))),
  updateAcademicProfile: (token: string, academicGroup: string, department: string) => request<{ user: CommunityUser }>('/profile/academic', authorized(token, json('PATCH', { academicGroup, department }))),
  submitAvatar: (token: string, imageDataUrl: string) => request<{ status: 'pending' }>('/profile/avatar', authorized(token, json('POST', { imageDataUrl }))),
  submitHeader: (token: string, imageDataUrl: string) => request<{ status: 'pending' }>('/profile/header', authorized(token, json('POST', { imageDataUrl }))),
};
