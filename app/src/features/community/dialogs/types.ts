import type { FormEvent } from 'react';
import type { CommunityPost, CommunityUser } from '../types';
import type { CommunityModal } from '../state/types';

export interface ModalLayerProps {
  modal: CommunityModal;
  token: string;
  user: CommunityUser | null;
  ja: boolean;
  busy: boolean;
  error: string;
  defaultAuthorName: string;
  postImages: string[];
  updatePostImages: (images: string[]) => void;
  avatarImage: string;
  headerImage: string;
  suggestedTags: string[];
  close: () => void;
  setAuthMode: (mode: 'login' | 'register') => void;
  authenticate: (event: FormEvent<HTMLFormElement>, mode: 'login' | 'register') => void;
  submitPost: (event: FormEvent<HTMLFormElement>) => void;
  saveProfile: (event: FormEvent<HTMLFormElement>) => void;
  removePost: (post: CommunityPost) => void;
  requestDelete: (post: CommunityPost) => void;
  openLikes: (post: CommunityPost) => void;
  canDeletePost: (post: CommunityPost) => boolean;
  openTag: (tag: string) => void;
  openProfile: (loginId: string) => void;
  toggleLike: (post: CommunityPost) => void;
  toggleBookmark: (post: CommunityPost) => void;
  readPost: (files?: FileList | File[] | null) => void;
  readAvatar: (file?: File) => void;
  readHeader: (file?: File) => void;
}
