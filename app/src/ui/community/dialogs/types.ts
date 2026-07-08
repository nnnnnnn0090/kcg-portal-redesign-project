import type { CommunityComment, CommunityPost, CommunityUser } from '../types';
import type { CommunityModal } from '../state/types';

export interface ModalLayerProps {
  modal: CommunityModal;
  token: string;
  user: CommunityUser | null;
  ja: boolean;
  busy: boolean;
  error: string;
  postImages: string[];
  updatePostImages: (images: string[]) => void;
  avatarImage: string;
  headerImage: string;
  suggestedTags: string[];
  close: () => void;
  setAuthMode: (mode: 'login' | 'register') => void;
  authenticate: (
    mode: 'login' | 'register',
    values: {
      loginId: string;
      displayName?: string;
      password: string;
      passwordConfirmation?: string;
    },
  ) => void;
  submitPost: (values: { title: string; caption: string }) => void;
  saveProfile: (values: {
    academicGroup: string;
    department: string;
    displayName: string;
    bio: string;
    websiteUrl: string;
    profileTags: string;
    socialLinks: Record<string, string>;
  }) => void;
  removePost: (post: CommunityPost) => void;
  removeComment: (post: CommunityPost, comment: CommunityComment) => void;
  deleteAccount: (password: string) => void;
  requestDelete: (post: CommunityPost) => void;
  requestDeleteComment: (post: CommunityPost, comment: CommunityComment) => void;
  backToPost: (post: CommunityPost) => void;
  openLikes: (post: CommunityPost) => void;
  canDeletePost: (post: CommunityPost) => boolean;
  commentsRevision: number;
  openTag: (tag: string) => void;
  openProfile: (loginId: string) => void;
  toggleLike: (post: CommunityPost) => void;
  toggleBookmark: (post: CommunityPost) => void;
  readPost: (files?: FileList | File[] | null) => void;
  readAvatar: (file?: File) => void;
  readHeader: (file?: File) => void;
}
