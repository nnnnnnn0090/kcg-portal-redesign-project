import type {
  CommunityComment as ContractComment,
  CommunityNotification as ContractNotification,
  CommunityPost as ContractPost,
  CommunityUser as ContractUser,
} from './contract';

export type {
  ApiEnvelope,
  ApiProblem,
  CommentStatus,
  PendingProfile,
  PostStatus,
  ProfileState,
  SocialLinks,
  SocialPlatform,
} from './contract';

export type CommunityUser = ContractUser;
export type CommunityComment = ContractComment;
export type CommunityNotification = ContractNotification;
export interface CommunityPost extends ContractPost {
  /** Authenticated private-image object URL; transient and never persisted. */
  previewUrl?: string;
}

export type CommunityPage =
  | 'home'
  | 'explore'
  | 'following'
  | 'notifications'
  | 'create'
  | 'profile';
