import { getOrCreateClientUserId } from '../../../lib/client-user-id';
import { CLIENT_USER_ID_HEADER } from '../../../shared/constants';
import type { ApiEnvelope, ApiProblem } from '../contract';
import { resolveCommunityMediaUrls } from './mediaUrls';
import { getCommunityApiOrigin, getCommunityRequestLoginId } from './runtime';

const COMMUNITY_LOGIN_ID_HEADER = 'X-KCG-Community-Login-Id';

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
    throw new Error(problem?.detail || `HTTP ${response.status}`);
  }
  if (!body || !('data' in body)) throw new Error(`HTTP ${response.status}`);
  return resolveCommunityMediaUrls(body.data, origin);
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
