import { ALL_TAG } from '../constants';
import type { CommunityPage, CommunityPost } from '../types';
import type { CommunityModal } from './types';

const KEYS = {
  open: 'ca',
  page: 'cp',
  user: 'cu',
  query: 'cq',
  tag: 'ct',
  post: 'cpost',
  modal: 'cm',
  conn: 'cc',
  auth: 'cauth',
} as const;

const COMMUNITY_KEYS = new Set<string>(Object.values(KEYS));

const PAGES = new Set<CommunityPage>([
  'home',
  'explore',
  'following',
  'bookmarks',
  'notifications',
  'feedback',
  'profile',
]);

export type ParsedCommunityUrl = {
  open: boolean;
  page: CommunityPage;
  userLoginId: string | null;
  query: string;
  tag: string;
  postId: string | null;
  modal: CommunityModal;
};

function clean(value: string | null, max: number): string {
  if (!value) return '';
  return value.trim().slice(0, max);
}

function postStub(id: string): CommunityPost {
  return { id } as CommunityPost;
}

function parsePage(value: string | null): CommunityPage {
  const page = clean(value, 16);
  return PAGES.has(page as CommunityPage) ? (page as CommunityPage) : 'home';
}

function parseModal(params: URLSearchParams): CommunityModal {
  const kind = clean(params.get(KEYS.modal), 16);
  const postId = clean(params.get(KEYS.post), 80);
  const userLoginId = clean(params.get(KEYS.user), 12);
  const conn = clean(params.get(KEYS.conn), 16);
  const auth = clean(params.get(KEYS.auth), 16);

  if (kind === 'auth' || auth) {
    return { kind: 'auth', mode: auth === 'register' ? 'register' : 'login' };
  }
  if (kind === 'create') return { kind: 'create' };
  if (kind === 'profile') return { kind: 'profile' };
  if (kind === 'sent') return { kind: 'sent' };
  if (kind === 'likes' && postId) {
    return { kind: 'likes', post: postStub(postId), users: [], loading: true };
  }
  if (kind === 'connections' && userLoginId && (conn === 'followers' || conn === 'following')) {
    return {
      kind: 'connections',
      relation: conn,
      ownerName: userLoginId,
      users: [],
      loading: true,
    };
  }
  if (postId) return { kind: 'post', post: postStub(postId) };
  return { kind: 'none' };
}

export function hasCommunityUrlParams(search = location.search): boolean {
  const params = new URLSearchParams(search);
  for (const key of COMMUNITY_KEYS) {
    if (params.has(key)) return true;
  }
  return false;
}

export function parseCommunityUrl(search = location.search): ParsedCommunityUrl {
  const params = new URLSearchParams(search);
  const page = parsePage(params.get(KEYS.page));
  const userLoginId = clean(params.get(KEYS.user), 12) || null;
  const tagValue = clean(params.get(KEYS.tag), 15);
  const tag = tagValue || ALL_TAG;
  const modal = parseModal(params);
  const postId = clean(params.get(KEYS.post), 80) || null;
  const query = clean(params.get(KEYS.query), 40);
  const open =
    params.get(KEYS.open) === '1' ||
    page !== 'home' ||
    Boolean(userLoginId) ||
    Boolean(query) ||
    tag !== ALL_TAG ||
    modal.kind !== 'none';

  return {
    open,
    page,
    userLoginId,
    query,
    tag,
    postId,
    modal,
  };
}

export function communityUrlFromState(values: {
  page: CommunityPage;
  query: string;
  tag: string;
  profileUser: { loginId: string } | null;
  modal: CommunityModal;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set(KEYS.open, '1');
  if (values.page !== 'home') params.set(KEYS.page, values.page);
  if (values.query.trim()) params.set(KEYS.query, values.query.trim());
  if (values.tag && values.tag !== ALL_TAG) params.set(KEYS.tag, values.tag);

  let profileLoginId: string | null = null;
  if (values.page === 'profile') profileLoginId = values.profileUser?.loginId || null;
  if (values.modal.kind === 'connections') profileLoginId = values.profileUser?.loginId || null;
  if (profileLoginId) params.set(KEYS.user, profileLoginId);

  switch (values.modal.kind) {
    case 'auth':
      params.set(KEYS.modal, 'auth');
      params.set(KEYS.auth, values.modal.mode);
      break;
    case 'create':
      params.set(KEYS.modal, 'create');
      break;
    case 'profile':
      params.set(KEYS.modal, 'profile');
      break;
    case 'sent':
      params.set(KEYS.modal, 'sent');
      break;
    case 'likes':
      params.set(KEYS.modal, 'likes');
      params.set(KEYS.post, values.modal.post.id);
      break;
    case 'connections':
      params.set(KEYS.modal, 'connections');
      params.set(KEYS.conn, values.modal.relation);
      break;
    case 'post':
      params.set(KEYS.post, values.modal.post.id);
      break;
    case 'delete':
    case 'deleteComment':
    case 'none':
      break;
  }

  return params;
}

function currentHrefWithoutCommunityParams(): URL {
  const url = new URL(location.href);
  for (const key of COMMUNITY_KEYS) url.searchParams.delete(key);
  return url;
}

export function replaceCommunityUrl(values: {
  page: CommunityPage;
  query: string;
  tag: string;
  profileUser: { loginId: string } | null;
  modal: CommunityModal;
}): void {
  const url = currentHrefWithoutCommunityParams();
  const nextParams = communityUrlFromState(values);
  nextParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (next === current) return;
  history.replaceState(history.state, '', next);
}

export function clearCommunityUrlParams(): void {
  if (!hasCommunityUrlParams()) return;
  const url = currentHrefWithoutCommunityParams();
  const next = `${url.pathname}${url.search}${url.hash}`;
  history.replaceState(history.state, '', next);
}
