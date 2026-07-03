export type PostStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'private';
export type ProfileState = 'draft' | 'pending' | 'editing' | 'published' | 'private';
export type SocialPlatform = 'github' | 'x' | 'pixiv' | 'zenn' | 'qiita' | 'hatena' | 'unityroom';
export type SocialLinks = Partial<Record<SocialPlatform, string>>;

export interface PendingProfile {
  displayName: string;
  bio: string;
  websiteUrl: string | null;
  socialLinks: SocialLinks;
  profileTags: string[];
  state: 'pending' | 'rejected';
  rejectionReason: string | null;
}

export interface CommunityUser {
  id: string;
  loginId: string;
  profileState: ProfileState;
  displayName: string;
  bio: string;
  websiteUrl: string | null;
  socialLinks: SocialLinks;
  profileTags: string[];
  academicGroup: string | null;
  department: string | null;
  avatarUrl: string | null;
  headerUrl: string | null;
  pendingProfile: PendingProfile | null;
  createdAt: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  followedByMe: boolean;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorLoginId: string;
  authorAvatarUrl: string | null;
  title: string;
  caption: string;
  tags: string[];
  imageUrl: string;
  imageUrls: string[];
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  status: PostStatus;
  rejectionReason: string | null;
  /** Authenticated private-image object URL; transient and never persisted. */
  previewUrl?: string;
}

export type CommentStatus = 'pending' | 'approved' | 'rejected';

export interface CommunityComment {
  id: string;
  postId: string;
  authorName: string;
  authorLoginId: string;
  authorAvatarUrl: string | null;
  content: string;
  status: CommentStatus;
  rejectionReason: string | null;
  createdAt: string;
}

export interface CommunityNotification {
  id: string;
  type: 'like' | 'follow' | 'post_approved' | 'post_rejected' | 'comment_approved' | 'comment_rejected' | 'profile_approved' | 'profile_rejected';
  createdAt: string;
  read: boolean;
  actor: CommunityUser;
  post: { id: string; title: string; imageUrl: string } | null;
}

export interface ApiSuccess<T> { ok: true; data: T }
export interface ApiFailure { ok: false; error: { message: string; code?: string } }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type CommunityPage = 'home' | 'explore' | 'following' | 'notifications' | 'create' | 'profile';
