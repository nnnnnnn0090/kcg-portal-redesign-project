import type { ApiEnvelope, ApiProblem } from './contract';
import { COMMUNITY_API_ORIGIN } from '../../shared/constants';
import { CLIENT_USER_ID_HEADER } from '../../shared/constants';
import { getOrCreateClientUserId } from '../../lib/client-user-id';
import type {
  CommunityComment,
  CommunityNotification,
  CommunityPost,
  CommunityUser,
} from './types';

const COMMUNITY_LOGIN_ID_HEADER = 'X-KCG-Community-Login-Id';
let requestLoginId = '';

export function setCommunityRequestLoginId(loginId: string | null | undefined) {
  requestLoginId = loginId?.trim() ?? '';
}

async function withRequestIdentity(init?: RequestInit): Promise<RequestInit> {
  const headers = new Headers(init?.headers);
  headers.set(CLIENT_USER_ID_HEADER, await getOrCreateClientUserId());
  if (requestLoginId) headers.set(COMMUNITY_LOGIN_ID_HEADER, requestLoginId);
  return { ...init, headers };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${COMMUNITY_API_ORIGIN}/api${path}`, {
    cache: 'no-store',
    ...(await withRequestIdentity(init)),
  });
  if (response.status === 204) return null as T;
  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiProblem | null;
  if (!response.ok) {
    const problem = body as ApiProblem | null;
    throw new Error(problem?.detail || `HTTP ${response.status}`);
  }
  if (!body || !('data' in body)) throw new Error(`HTTP ${response.status}`);
  return resolveApiUrls(body.data);
}
function resolveApiUrls<T>(value: T): T {
  if (typeof value === 'string')
    return (value.startsWith('/api/') ? `${COMMUNITY_API_ORIGIN}${value}` : value) as T;
  if (Array.isArray(value)) return value.map(resolveApiUrls) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveApiUrls(item)]),
    ) as T;
  return value;
}
const authorized = (token: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...init.headers, authorization: `Bearer ${token}` },
});
const json = (method: string, body?: object): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
async function dataUrlBlob(value: string): Promise<Blob> {
  return (await fetch(value)).blob();
}
async function imageForm(imageDataUrl: string): Promise<FormData> {
  const form = new FormData();
  const blob = await dataUrlBlob(imageDataUrl);
  form.append('image', blob, `image.${blob.type.split('/')[1] || 'png'}`);
  return form;
}

export const communityApi = {
  posts: (token?: string) =>
    request<{ posts: CommunityPost[] }>('/posts', token ? authorized(token) : undefined),
  session: (token: string) => request<{ user: CommunityUser }>('/session', authorized(token)),
  authenticate: (mode: 'register' | 'login', body: object) =>
    request<{ token: string; user: CommunityUser }>(`/auth/${mode}`, json('POST', body)),
  logout: (token: string) => request<null>('/session', authorized(token, { method: 'DELETE' })),
  ownPosts: (token: string) => request<{ posts: CommunityPost[] }>('/me/posts', authorized(token)),
  followingPosts: (token: string) =>
    request<{ posts: CommunityPost[] }>('/feed?scope=following', authorized(token)),
  bookmarkedPosts: (token: string) =>
    request<{ posts: CommunityPost[] }>('/me/bookmarks', authorized(token)),
  user: (loginId: string, token?: string) =>
    request<{ user: CommunityUser }>(
      `/users/${encodeURIComponent(loginId)}`,
      token ? authorized(token) : undefined,
    ),
  userPosts: (loginId: string, token?: string) =>
    request<{ posts: CommunityPost[] }>(
      `/users/${encodeURIComponent(loginId)}/posts`,
      token ? authorized(token) : undefined,
    ),
  ownPostImage: async (token: string, id: string, position = 0) => {
    const response = await fetch(
      `${COMMUNITY_API_ORIGIN}/api/posts/${encodeURIComponent(id)}/images/${position}`,
      await withRequestIdentity(authorized(token)),
    );
    if (!response.ok) throw new Error('画像を読み込めませんでした');
    return URL.createObjectURL(await response.blob());
  },
  ownProfileImage: async (token: string, kind: 'avatar' | 'header') => {
    const response = await fetch(
      `${COMMUNITY_API_ORIGIN}/api/me/profile-submission/images/${kind}`,
      await withRequestIdentity(authorized(token)),
    );
    if (!response.ok) throw new Error('画像を読み込めませんでした');
    return URL.createObjectURL(await response.blob());
  },
  followers: (loginId: string, token?: string) =>
    request<{ users: CommunityUser[] }>(
      `/users/${encodeURIComponent(loginId)}/followers`,
      token ? authorized(token) : undefined,
    ),
  following: (loginId: string, token?: string) =>
    request<{ users: CommunityUser[] }>(
      `/users/${encodeURIComponent(loginId)}/following`,
      token ? authorized(token) : undefined,
    ),
  searchUsers: (query: string, token?: string) =>
    request<{ users: CommunityUser[] }>(
      `/users?q=${encodeURIComponent(query)}`,
      token ? authorized(token) : undefined,
    ),
  tags: () => request<{ tags: string[] }>('/tags'),
  createPost: async (token: string, body: Record<string, unknown>) => {
    const form = new FormData();
    form.append('title', String(body.title || ''));
    form.append('caption', String(body.caption || ''));
    for (const image of (body.imageDataUrls as string[]) || []) {
      const blob = await dataUrlBlob(image);
      form.append('images', blob, `image.${blob.type.split('/')[1] || 'png'}`);
    }
    return request<{ id: string; status: 'pending' }>(
      '/posts',
      authorized(token, { method: 'POST', body: form }),
    );
  },
  updatePost: (token: string, id: string, body: object) =>
    request<{ post: CommunityPost }>(
      `/posts/${encodeURIComponent(id)}`,
      authorized(token, json('PATCH', body)),
    ),
  deletePost: (token: string, id: string) =>
    request<null>(`/posts/${encodeURIComponent(id)}`, authorized(token, { method: 'DELETE' })),
  likePost: (token: string, id: string) =>
    request<{ likedByMe: boolean; likeCount: number }>(
      `/posts/${encodeURIComponent(id)}/likes`,
      authorized(token, { method: 'PUT' }),
    ),
  unlikePost: (token: string, id: string) =>
    request<{ likedByMe: boolean; likeCount: number }>(
      `/posts/${encodeURIComponent(id)}/likes`,
      authorized(token, { method: 'DELETE' }),
    ),
  postLikes: (id: string, token?: string) =>
    request<{ users: CommunityUser[] }>(
      `/posts/${encodeURIComponent(id)}/likes`,
      token ? authorized(token) : undefined,
    ),
  bookmarkPost: (token: string, id: string) =>
    request<{ bookmarkedByMe: boolean; bookmarkCount: number }>(
      `/posts/${encodeURIComponent(id)}/bookmarks`,
      authorized(token, { method: 'PUT' }),
    ),
  unbookmarkPost: (token: string, id: string) =>
    request<{ bookmarkedByMe: boolean; bookmarkCount: number }>(
      `/posts/${encodeURIComponent(id)}/bookmarks`,
      authorized(token, { method: 'DELETE' }),
    ),
  postComments: (id: string, token?: string) =>
    request<{ comments: CommunityComment[] }>(
      `/posts/${encodeURIComponent(id)}/comments`,
      token ? authorized(token) : undefined,
    ),
  createComment: (token: string, id: string, content: string) =>
    request<{ comment: CommunityComment }>(
      `/posts/${encodeURIComponent(id)}/comments`,
      authorized(token, json('POST', { content })),
    ),
  deleteComment: (token: string, postId: string, commentId: string) =>
    request<null>(
      `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      authorized(token, { method: 'DELETE' }),
    ),
  report: (
    token: string,
    targetType: 'post' | 'comment' | 'profile',
    targetId: string,
    reason: string,
  ) =>
    request<{ status: string }>(
      '/reports',
      authorized(token, json('POST', { targetType, targetId, reason })),
    ),
  notifications: (token: string) =>
    request<{ notifications: CommunityNotification[]; unreadCount: number }>(
      '/me/notifications',
      authorized(token),
    ),
  readNotifications: (token: string) =>
    request<{ unreadCount: number }>(
      '/me/notifications/read',
      authorized(token, { method: 'POST' }),
    ),
  followUser: (token: string, loginId: string) =>
    request<CommunityUser>(
      `/users/${encodeURIComponent(loginId)}/follow`,
      authorized(token, { method: 'PUT' }),
    ),
  unfollowUser: (token: string, loginId: string) =>
    request<CommunityUser>(
      `/users/${encodeURIComponent(loginId)}/follow`,
      authorized(token, { method: 'DELETE' }),
    ),
  updateProfile: (token: string, body: object) =>
    request<{ user: CommunityUser }>(
      '/me/profile-submission',
      authorized(token, json('PUT', body)),
    ),
  updateAcademicProfile: (token: string, academicGroup: string, department: string) =>
    request<{ user: CommunityUser }>(
      '/me/academic',
      authorized(token, json('PATCH', { academicGroup, department })),
    ),
  submitAvatar: async (token: string, imageDataUrl: string) =>
    request<{ status: 'pending' }>(
      '/me/profile-submission/images/avatar',
      authorized(token, { method: 'PUT', body: await imageForm(imageDataUrl) }),
    ),
  submitHeader: async (token: string, imageDataUrl: string) =>
    request<{ status: 'pending' }>(
      '/me/profile-submission/images/header',
      authorized(token, { method: 'PUT', body: await imageForm(imageDataUrl) }),
    ),
};
