/**
 * ポータル fetch フックから届く postMessage をホームページ向け状態へ畳み込む純粋ロジック。
 * 各ページ向けの reducer は portal-messages-pages.ts を参照。
 */

import { MSG } from '../shared/constants';
import type { PortalCapturedMessage } from '../shared/types';

// ─── 型 ───────────────────────────────────────────────────────────────────

export interface KinoMessagePayload {
  title?:   string;
  message?: string;
}

export interface UserHtmlLinkItem {
  midashi: string;
  url:     string;
  biko?:   string;
}

export interface HomePortalInboxState {
  kinoData:       KinoMessagePayload | null;
  kogiNews:       unknown[];
  newTopicsItems: unknown[];
  linkItems:      UserHtmlLinkItem[];
}

// ─── 型ガード ─────────────────────────────────────────────────────────────

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x);
}

export function isKinoMessagePayload(data: unknown): data is KinoMessagePayload {
  if (!isRecord(data)) return false;
  const t = data.title;
  const m = data.message;
  if (t !== undefined && typeof t !== 'string') return false;
  if (m !== undefined && typeof m !== 'string') return false;
  return true;
}

export function isUserHtmlLinkItem(x: unknown): x is UserHtmlLinkItem {
  if (!isRecord(x)) return false;
  return typeof x.midashi === 'string' && typeof x.url === 'string';
}

function narrowUserHtmlLinkItems(items: unknown[]): UserHtmlLinkItem[] {
  return items.filter(isUserHtmlLinkItem);
}

// ─── 畳み込み ─────────────────────────────────────────────────────────────

/** 1 メッセージ分の状態更新（純粋関数・テスト可能） */
export function applyHomePortalMessage(
  prev: HomePortalInboxState,
  msg: PortalCapturedMessage,
): HomePortalInboxState {
  switch (msg.type) {
    case MSG.kinoMessage:
      if (msg.data !== undefined && isKinoMessagePayload(msg.data)) {
        return { ...prev, kinoData: msg.data };
      }
      return prev;

    case MSG.kogiNews:
      if (Array.isArray(msg.items)) {
        return { ...prev, kogiNews: msg.items };
      }
      return prev;

    case MSG.newTopics:
      if (Array.isArray(msg.items)) {
        return { ...prev, newTopicsItems: msg.items };
      }
      return prev;

    case MSG.userHtmlLink:
      if (Array.isArray(msg.items)) {
        return { ...prev, linkItems: narrowUserHtmlLinkItems(msg.items) };
      }
      return prev;

    default:
      return prev;
  }
}
