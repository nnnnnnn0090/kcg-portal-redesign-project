import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { CommunityNotification, CommunityPage, CommunityPost, CommunityUser } from '../types';

export type CommunityModal =
  | { kind: 'none' }
  | { kind: 'auth'; mode: 'login' | 'register' }
  | { kind: 'create' }
  | { kind: 'post'; post: CommunityPost }
  | { kind: 'profile' }
  | { kind: 'delete'; post: CommunityPost }
  | { kind: 'likes'; post: CommunityPost; users: CommunityUser[]; loading: boolean }
  | {
      kind: 'connections';
      relation: 'followers' | 'following';
      ownerName: string;
      users: CommunityUser[];
      loading: boolean;
    }
  | { kind: 'sent' };

export interface CommunityState {
  ja: boolean;
  defaultAuthorName: string;
  page: CommunityPage;
  modal: CommunityModal;
  posts: CommunityPost[];
  ownPosts: CommunityPost[];
  followingPosts: CommunityPost[];
  bookmarkedPosts: CommunityPost[];
  knownTags: string[];
  searchUsers: CommunityUser[];
  notifications: CommunityNotification[];
  unreadCount: number;
  profileUser: CommunityUser | null;
  profilePosts: CommunityPost[];
  user: CommunityUser | null;
  token: string;
  query: string;
  tag: string;
  loading: boolean;
  refreshing: boolean;
  busy: boolean;
  error: string;
  postImages: string[];
  avatarImage: string;
  headerImage: string;
  closing: boolean;
}

type SetAction = {
  [Key in keyof CommunityState]: {
    type: 'set';
    key: Key;
    value: SetStateAction<CommunityState[Key]>;
  };
}[keyof CommunityState];

export type CommunityAction =
  | SetAction
  | { type: 'patch'; value: Partial<CommunityState> }
  | { type: 'patchPost'; postId: string; value: Partial<CommunityPost> }
  | { type: 'restorePost'; post: CommunityPost }
  | { type: 'resetSession' };

export type CommunityStateDispatch = Dispatch<CommunityAction>;

export interface CommunityActions {
  closeDrawer: () => void;
  loadFeed: (authToken?: string, silent?: boolean) => Promise<void>;
  go: (page: CommunityPage) => void;
  openProfile: (loginId: string) => Promise<void>;
  openTag: (tag: string) => void;
  openConnections: (profile: CommunityUser, relation: 'followers' | 'following') => Promise<void>;
  authenticate: (event: FormEvent<HTMLFormElement>, mode: 'login' | 'register') => Promise<void>;
  logout: () => Promise<void>;
  submitPost: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  saveProfile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  removePost: (post: CommunityPost) => Promise<void>;
  toggleLike: (post: CommunityPost) => Promise<void>;
  toggleBookmark: (post: CommunityPost) => Promise<void>;
  toggleFollow: (target: CommunityUser) => Promise<void>;
  refreshCurrentPage: () => Promise<void>;
  openLikes: (post: CommunityPost) => void;
  openProfileEditor: () => void;
  closeModal: () => void;
  setAuthMode: (mode: 'login' | 'register') => void;
  setModal: (modal: CommunityModal) => void;
  setQuery: (query: string) => void;
  setTag: (tag: string) => void;
  setPostImages: (images: SetStateAction<string[]>) => void;
  readPostFiles: (files?: FileList | File[] | null) => void;
  readAvatar: (file?: File) => void;
  readHeader: (file?: File) => void;
  canDeletePost: (post: CommunityPost) => boolean;
}
