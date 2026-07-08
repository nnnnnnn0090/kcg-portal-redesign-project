/**
 * コミュニティ API クライアント（§10.4 / F-048）。38 呼出を単一モジュールに列挙。
 */

import type { ReportStatus, SocialLinks } from '../contract/community-api';
import type { ApiEnvelope, ApiProblem } from '../contract/community-api';
import { resolveCommunityMediaUrls } from './community-media-urls';
import {
  getCommunityApiOrigin,
  getCommunityRequestLoginId,
} from './community-runtime';
import type {
  CommunityComment,
  CommunityNotification,
  CommunityPost,
  CommunityUser,
} from '../ui/community/types';
import { CLIENT_USER_ID_HEADER } from '../contract/origins';
import { getOrCreateClientUserId } from './client-identity';

const COMMUNITY_LOGIN_ID_HEADER = 'X-KCG-Community-Login-Id';

export function formatCommunityProblem(
  problem: ApiProblem | null,
  status: number,
): string {
  const fieldMessages = Object.values(problem?.fieldErrors ?? {})
    .flat()
    .filter((message): message is string => typeof message === 'string' && message.length > 0);
  if (fieldMessages.length > 0) return fieldMessages[0]!;
  return problem?.detail || `HTTP ${status}`;
}

export async function withCommunityRequestIdentity(init: RequestInit = {}): Promise<RequestInit> {
  const headers = new Headers(init.headers);
  headers.set(CLIENT_USER_ID_HEADER, await getOrCreateClientUserId());
  const loginId = getCommunityRequestLoginId();
  if (loginId) headers.set(COMMUNITY_LOGIN_ID_HEADER, loginId);
  return { ...init, headers };
}

export async function communityRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const origin = getCommunityApiOrigin();
  const response = await fetch(`${origin}/api${path}`, {
    cache: 'no-store',
    ...(await withCommunityRequestIdentity(init)),
  });
  if (response.status === 204) return null as T;

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiProblem | null;
  if (!response.ok) {
    const problem = body as ApiProblem | null;
    throw new Error(formatCommunityProblem(problem, response.status));
  }
  if (!body || !('data' in body)) throw new Error(`HTTP ${response.status}`);
  return resolveCommunityMediaUrls(body.data, origin);
}

export async function communityRequestWithMeta<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta?: ApiEnvelope<T>['meta'] }> {
  const origin = getCommunityApiOrigin();
  const response = await fetch(`${origin}/api${path}`, {
    cache: 'no-store',
    ...(await withCommunityRequestIdentity(init)),
  });
  if (response.status === 204) return { data: null as T };

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiProblem | null;
  if (!response.ok) {
    const problem = body as ApiProblem | null;
    throw new Error(formatCommunityProblem(problem, response.status));
  }
  if (!body || !('data' in body)) throw new Error(`HTTP ${response.status}`);
  return {
    data: resolveCommunityMediaUrls(body.data, origin),
    meta: body.meta,
  };
}

export function authorizedRequest(token: string, init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  return { ...init, headers };
}

export function jsonRequest(method: string, body?: object): RequestInit {
  const headers = new Headers({ 'content-type': 'application/json' });
  return {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  };
}

export async function dataUrlBlob(value: string): Promise<Blob> {
  return (await fetch(value)).blob();
}

export async function imageForm(imageDataUrl: string): Promise<FormData> {
  const form = new FormData();
  const blob = await dataUrlBlob(imageDataUrl);
  form.append('image', blob, `image.${blob.type.split('/')[1] || 'png'}`);
  return form;
}

export interface AuthenticateInput {
  loginId: string;
  displayName: string | null;
  password: string;
}

export interface CreatePostInput {
  title: string;
  caption: string;
  imageDataUrls: string[];
}

export interface UpdateProfileInput {
  displayName: string;
  bio: string;
  websiteUrl: string;
  profileTags: string;
  socialLinks: SocialLinks;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}

export interface DeleteAccountInput {
  password: string;
}

function feedPath(params: { scope?: 'following'; cursor?: string | null } = {}) {
  const search = new URLSearchParams();
  if (params.scope) search.set('scope', params.scope);
  if (params.cursor) search.set('cursor', params.cursor);
  const query = search.toString();
  return params.scope === 'following'
    ? `/feed${query ? `?${query}` : ''}`
    : `/posts${query ? `?${query}` : ''}`;
}

export const communityApi = {
  posts: async (token?: string, cursor?: string | null) => {
    const result = await communityRequestWithMeta<{ posts: CommunityPost[] }>(
      feedPath({ cursor }),
      token ? authorizedRequest(token) : undefined,
    );
    return { posts: result.data.posts, nextCursor: result.meta?.nextCursor ?? null };
  },
  post: (id: string, token?: string) =>
    communityRequest<{ post: CommunityPost }>(
      `/posts/${encodeURIComponent(id)}`,
      token ? authorizedRequest(token) : undefined,
    ),
  session: (token: string) =>
    communityRequest<{ user: CommunityUser }>('/session', authorizedRequest(token)),
  authenticate: (mode: 'register' | 'login', body: AuthenticateInput) =>
    communityRequest<{ token: string; user: CommunityUser }>(
      `/auth/${mode}`,
      jsonRequest('POST', body),
    ),
  logout: (token: string) =>
    communityRequest<null>('/session', authorizedRequest(token, { method: 'DELETE' })),
  ownPosts: (token: string) =>
    communityRequest<{ posts: CommunityPost[] }>('/me/posts', authorizedRequest(token)),
  followingPosts: async (token: string, cursor?: string | null) => {
    const result = await communityRequestWithMeta<{ posts: CommunityPost[] }>(
      feedPath({ scope: 'following', cursor }),
      authorizedRequest(token),
    );
    return { posts: result.data.posts, nextCursor: result.meta?.nextCursor ?? null };
  },
  bookmarkedPosts: (token: string) =>
    communityRequest<{ posts: CommunityPost[] }>('/me/bookmarks', authorizedRequest(token)),
  user: (loginId: string, token?: string) =>
    communityRequest<{ user: CommunityUser }>(
      `/users/${encodeURIComponent(loginId)}`,
      token ? authorizedRequest(token) : undefined,
    ),
  userPosts: (loginId: string, token?: string) =>
    communityRequest<{ posts: CommunityPost[] }>(
      `/users/${encodeURIComponent(loginId)}/posts`,
      token ? authorizedRequest(token) : undefined,
    ),
  ownPostImage: async (token: string, id: string, position = 0) => {
    const response = await fetch(
      `${getCommunityApiOrigin()}/api/posts/${encodeURIComponent(id)}/images/${position}`,
      await withCommunityRequestIdentity(authorizedRequest(token)),
    );
    if (!response.ok) throw new Error('画像を読み込めませんでした');
    return URL.createObjectURL(await response.blob());
  },
  ownProfileImage: async (token: string, kind: 'avatar' | 'header') => {
    const response = await fetch(
      `${getCommunityApiOrigin()}/api/me/profile-submission/images/${kind}`,
      await withCommunityRequestIdentity(authorizedRequest(token)),
    );
    if (!response.ok) throw new Error('画像を読み込めませんでした');
    return URL.createObjectURL(await response.blob());
  },
  followers: (loginId: string, token?: string) =>
    communityRequest<{ users: CommunityUser[] }>(
      `/users/${encodeURIComponent(loginId)}/followers`,
      token ? authorizedRequest(token) : undefined,
    ),
  following: (loginId: string, token?: string) =>
    communityRequest<{ users: CommunityUser[] }>(
      `/users/${encodeURIComponent(loginId)}/following`,
      token ? authorizedRequest(token) : undefined,
    ),
  searchUsers: (query: string, token?: string) =>
    communityRequest<{ users: CommunityUser[] }>(
      `/users?q=${encodeURIComponent(query)}`,
      token ? authorizedRequest(token) : undefined,
    ),
  tags: () => communityRequest<{ tags: string[] }>('/tags'),
  createPost: async (token: string, body: CreatePostInput) => {
    const form = new FormData();
    form.append('title', String(body.title || ''));
    form.append('caption', String(body.caption || ''));
    for (const image of body.imageDataUrls) {
      const blob = await dataUrlBlob(image);
      form.append('images', blob, `image.${blob.type.split('/')[1] || 'png'}`);
    }
    return communityRequest<{ id: string; status: 'pending' }>(
      '/posts',
      authorizedRequest(token, { method: 'POST', body: form }),
    );
  },
  deletePost: (token: string, id: string) =>
    communityRequest<null>(
      `/posts/${encodeURIComponent(id)}`,
      authorizedRequest(token, { method: 'DELETE' }),
    ),
  likePost: (token: string, id: string) =>
    communityRequest<{ likedByMe: boolean; likeCount: number }>(
      `/posts/${encodeURIComponent(id)}/likes`,
      authorizedRequest(token, { method: 'PUT' }),
    ),
  unlikePost: (token: string, id: string) =>
    communityRequest<{ likedByMe: boolean; likeCount: number }>(
      `/posts/${encodeURIComponent(id)}/likes`,
      authorizedRequest(token, { method: 'DELETE' }),
    ),
  postLikes: (id: string, token?: string) =>
    communityRequest<{ users: CommunityUser[] }>(
      `/posts/${encodeURIComponent(id)}/likes`,
      token ? authorizedRequest(token) : undefined,
    ),
  bookmarkPost: (token: string, id: string) =>
    communityRequest<{ bookmarkedByMe: boolean; bookmarkCount: number }>(
      `/posts/${encodeURIComponent(id)}/bookmarks`,
      authorizedRequest(token, { method: 'PUT' }),
    ),
  unbookmarkPost: (token: string, id: string) =>
    communityRequest<{ bookmarkedByMe: boolean; bookmarkCount: number }>(
      `/posts/${encodeURIComponent(id)}/bookmarks`,
      authorizedRequest(token, { method: 'DELETE' }),
    ),
  postComments: (id: string, token?: string) =>
    communityRequest<{ comments: CommunityComment[] }>(
      `/posts/${encodeURIComponent(id)}/comments`,
      token ? authorizedRequest(token) : undefined,
    ),
  recordImpression: (id: string, token?: string) =>
    communityRequest<{ impressionCount: number }>(
      `/posts/${encodeURIComponent(id)}/impressions`,
      token ? authorizedRequest(token, { method: 'POST' }) : { method: 'POST' },
    ),
  createComment: (token: string, id: string, content: string, parentId?: string) =>
    communityRequest<{ comment: CommunityComment }>(
      `/posts/${encodeURIComponent(id)}/comments`,
      authorizedRequest(
        token,
        jsonRequest('POST', parentId ? { content, parentId } : { content }),
      ),
    ),
  deleteComment: (token: string, postId: string, commentId: string) =>
    communityRequest<null>(
      `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      authorizedRequest(token, { method: 'DELETE' }),
    ),
  report: (
    token: string,
    targetType: 'post' | 'comment' | 'profile',
    targetId: string,
    reason: string,
  ) =>
    communityRequest<{ status: ReportStatus }>(
      '/reports',
      authorizedRequest(token, jsonRequest('POST', { targetType, targetId, reason })),
    ),
  submitContactInquiry: (
    body: {
      category: 'bug' | 'feature' | 'account' | 'community' | 'other';
      subject: string;
      message: string;
    },
    token?: string,
  ) =>
    communityRequest<{ status: ReportStatus }>(
      '/contact-inquiries',
      token
        ? authorizedRequest(token, jsonRequest('POST', body))
        : jsonRequest('POST', body),
    ),
  submitSuggestion: (message: string, token?: string) =>
    communityRequest<{ status: ReportStatus }>(
      '/community-suggestions',
      token
        ? authorizedRequest(token, jsonRequest('POST', { message }))
        : jsonRequest('POST', { message }),
    ),
  notifications: (token: string) =>
    communityRequest<{ notifications: CommunityNotification[]; unreadCount: number }>(
      '/me/notifications',
      authorizedRequest(token),
    ),
  readNotifications: (token: string) =>
    communityRequest<{ unreadCount: number }>(
      '/me/notifications/read',
      authorizedRequest(token, { method: 'POST' }),
    ),
  followUser: (token: string, loginId: string) =>
    communityRequest<CommunityUser>(
      `/users/${encodeURIComponent(loginId)}/follow`,
      authorizedRequest(token, { method: 'PUT' }),
    ),
  unfollowUser: (token: string, loginId: string) =>
    communityRequest<CommunityUser>(
      `/users/${encodeURIComponent(loginId)}/follow`,
      authorizedRequest(token, { method: 'DELETE' }),
    ),
  updateProfile: (token: string, body: UpdateProfileInput) =>
    communityRequest<{ user: CommunityUser }>(
      '/me/profile-submission',
      authorizedRequest(token, jsonRequest('PUT', body)),
    ),
  updateAcademicProfile: (token: string, academicGroup: string, department: string) =>
    communityRequest<{ user: CommunityUser }>(
      '/me/academic',
      authorizedRequest(token, jsonRequest('PATCH', { academicGroup, department })),
    ),
  changePassword: (token: string, body: ChangePasswordInput) =>
    communityRequest<{ ok: true }>(
      '/me/password',
      authorizedRequest(token, jsonRequest('POST', body)),
    ),
  deleteAccount: (token: string, body: DeleteAccountInput) =>
    communityRequest<{ ok: true }>('/me', authorizedRequest(token, jsonRequest('DELETE', body))),
  submitAvatar: async (token: string, imageDataUrl: string) =>
    communityRequest<{ status: 'pending' }>(
      '/me/profile-submission/images/avatar',
      authorizedRequest(token, { method: 'PUT', body: await imageForm(imageDataUrl) }),
    ),
  submitHeader: async (token: string, imageDataUrl: string) =>
    communityRequest<{ status: 'pending' }>(
      '/me/profile-submission/images/header',
      authorizedRequest(token, { method: 'PUT', body: await imageForm(imageDataUrl) }),
    ),
};
