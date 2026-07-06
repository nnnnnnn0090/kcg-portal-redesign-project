import type { ReportStatus, SocialLinks } from './contract';
import {
  authorizedRequest,
  communityRequest,
  dataUrlBlob,
  imageForm,
  jsonRequest,
  withCommunityRequestIdentity,
} from './api/http';
import { getCommunityApiOrigin } from './api/runtime';
import type {
  CommunityComment,
  CommunityNotification,
  CommunityPost,
  CommunityUser,
} from './types';

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

export const communityApi = {
  posts: (token?: string) =>
    communityRequest<{ posts: CommunityPost[] }>(
      '/posts',
      token ? authorizedRequest(token) : undefined,
    ),
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
  followingPosts: (token: string) =>
    communityRequest<{ posts: CommunityPost[] }>('/feed?scope=following', authorizedRequest(token)),
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
  createComment: (token: string, id: string, content: string) =>
    communityRequest<{ comment: CommunityComment }>(
      `/posts/${encodeURIComponent(id)}/comments`,
      authorizedRequest(token, jsonRequest('POST', { content })),
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
