export interface CommunityUser {
  id: string;
  loginId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  avatarStatus?: 'pending' | 'approved' | 'rejected' | null;
  avatarRejectionReason?: string | null;
  headerUrl?: string;
  headerStatus?: 'pending' | 'approved' | 'rejected' | null;
  headerRejectionReason?: string | null;
  displayNameStatus?: 'pending' | 'approved' | 'rejected' | null;
  pendingDisplayName?: string | null;
  displayNameRejectionReason?: string | null;
  createdAt?: string;
  postCount?: number;
  followerCount?: number;
  followingCount?: number;
  followedByMe?: boolean;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorLoginId?: string | null;
  authorAvatarUrl?: string | null;
  title: string;
  caption: string;
  tags: string[];
  imageUrl: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | null;
  previewUrl?: string;
}

export type CommunityPage = 'home' | 'explore' | 'following' | 'create' | 'profile';
