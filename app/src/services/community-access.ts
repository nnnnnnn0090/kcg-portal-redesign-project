/**
 * 「みんなの活動」入口の公開可否確認（F-045）。
 */

import { CLIENT_USER_ID_HEADER, COMMUNITY_ACCESS_URL } from '../contract/origins';
import { storageRepo } from '../platform/storage/repo';
import { getOrCreateClientUserId } from './client-identity';

export interface CommunityAccessResult {
  enabled: boolean;
  apiOrigin: string;
}

type CommunityAccessResponse = { enabled?: unknown; apiOrigin?: unknown };

export function normalizeCommunityApiOrigin(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    return url.origin;
  } catch {
    return '';
  }
}

function parseCommunityAccessResponse(result: CommunityAccessResponse): CommunityAccessResult {
  const apiOrigin = normalizeCommunityApiOrigin(result.apiOrigin);
  const enabled = result.enabled === true && apiOrigin.length > 0;
  return { enabled, apiOrigin: enabled ? apiOrigin : '' };
}

export async function getCommunityDisclaimerAccepted(): Promise<boolean> {
  return storageRepo.getCommunityDisclaimerAccepted();
}

export async function acceptCommunityDisclaimer(): Promise<void> {
  await storageRepo.setCommunityDisclaimerAccepted(true);
}

/** 匿名 UUID で community-access を問い合わせる */
export async function fetchCommunityAccess(signal?: AbortSignal): Promise<CommunityAccessResult> {
  const userId = await getOrCreateClientUserId();
  const response = await fetch(COMMUNITY_ACCESS_URL, {
    cache: 'no-store',
    headers: { [CLIENT_USER_ID_HEADER]: userId },
    signal,
  });
  if (!response.ok) throw new Error(String(response.status));
  const result = (await response.json()) as CommunityAccessResponse;
  return parseCommunityAccessResponse(result);
}
