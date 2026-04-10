/**
 * 各ページ向け portal postMessage の純粋な畳み込み（ホーム以外）。
 * お知らせ一覧・詳細・アンケート・休講補講教室変更の各 reducer を提供する。
 */

import { MSG } from '../shared/constants';
import type { PortalCapturedMessage } from '../shared/types';
import { isKinoMessagePayload, type KinoMessagePayload } from './portal-messages-home';

// ─── 共通ユーティリティ ───────────────────────────────────────────────────────

/**
 * ポータル API の行オブジェクトから、複数のキー候補のうち最初に値があるフィールドを
 * 文字列として返す。空白のみの値はスキップする。
 *
 * API バージョンによってキー名が異なる場合（例: `kogiNm` / `kogiName`）に使用する。
 */
export function pick(obj: Record<string, unknown> | null, keys: string[]): string {
  if (!obj) return '';
  for (const k of keys) {
    if (obj[k] != null && String(obj[k]).trim() !== '') return String(obj[k]);
  }
  return '';
}

// ─── お知らせ一覧 ─────────────────────────────────────────────────────────

export interface NewsListItem {
  id?:           unknown;
  title?:        string;
  newsDate?:     string;
  sender?:       string;
  category?:     string;
  categoryCd?:   string;
  importanceCd?: string;
  importance?:   string;
  readFlg?:      string | number;
  newFlg?:       string | number;
}

export interface NewsListPortalState {
  kinoData: KinoMessagePayload | null;
  raw:      NewsListItem[] | null;
}

export function nendoFromDeliveredNewsUrl(href: string): string {
  try {
    const m = new URL(href, location.origin).pathname.match(/\/DeliveredNews\/Nendo\/([^/]+)/);
    return m ? m[1]! : '';
  } catch {
    return '';
  }
}

/**
 * お知らせ一覧の postMessage を状態に畳み込む。
 *
 * `pendingNendo` は呼び出し側が保持する mutable ref で、リクエスト送信時に
 * 「現在リクエスト中の年度」をセットしておく。レスポンスの年度が一致しない場合は
 * 古いリクエストへの返答とみなして state を変えずに返す。
 * （純粋関数に保ちながら "最後に送ったリクエスト" を追跡するための慣用パターン）
 */
export function reduceNewsListPortalMessage(
  prev: NewsListPortalState,
  msg: PortalCapturedMessage,
  pendingNendo: { current: string | null },
): NewsListPortalState {
  if (msg.type === MSG.kinoMessage && msg.data !== undefined && isKinoMessagePayload(msg.data)) {
    return { ...prev, kinoData: msg.data };
  }
  if (msg.type === MSG.deliveredNews) {
    const reqUrl    = String((msg as Record<string, unknown>).requestUrl ?? '');
    const respNendo = nendoFromDeliveredNewsUrl(reqUrl);
    if (respNendo && respNendo !== pendingNendo.current) return prev;
    pendingNendo.current = null;
    return {
      ...prev,
      raw: Array.isArray(msg.items) ? (msg.items as NewsListItem[]) : [],
    };
  }
  return prev;
}

// ─── お知らせ詳細 ─────────────────────────────────────────────────────────

export interface NewsDetailPayload {
  id?:              unknown;
  title?:           string;
  newsDate?:        string;
  sender?:          string;
  category?:        string;
  naiyo?:           string;
  attachmentFiles?: unknown[];
}

export function reduceNewsDetailPortalMessage(
  prev: NewsDetailPayload | null,
  msg: PortalCapturedMessage,
  newsDetailId: string,
): NewsDetailPayload | null {
  if (msg.type !== MSG.deliveredNewsDetail) return prev;
  const d = (msg as Record<string, unknown>).data;
  if (!d || typeof d !== 'object') return prev;
  const data = d as Record<string, unknown>;
  if (String(data.id ?? '') !== String(newsDetailId)) return prev;
  return data as unknown as NewsDetailPayload;
}

// ─── アンケート一覧 ─────────────────────────────────────────────────────────

export type SurveyRow = Record<string, unknown>;

export interface SurveyPortalState {
  kinoData: KinoMessagePayload | null;
  raw:      SurveyRow[] | null;
}

export function reduceSurveyPortalMessage(prev: SurveyPortalState, msg: PortalCapturedMessage): SurveyPortalState {
  if (msg.type === MSG.kinoMessage && msg.data !== undefined && isKinoMessagePayload(msg.data)) {
    return { ...prev, kinoData: msg.data };
  }
  if (msg.type === MSG.questionnaireInfo && Array.isArray(msg.items)) {
    return { ...prev, raw: msg.items as SurveyRow[] };
  }
  return prev;
}

// ─── 休講・補講・教室変更 ─────────────────────────────────────────────────

export type KyukoRow = Record<string, unknown>;

export interface KyukoPortalState {
  kinoData:    KinoMessagePayload | null;
  kkRaw:       KyukoRow[] | null;
  hkRaw:       KyukoRow[] | null;
  kcRaw:       KyukoRow[] | null;
  rishuToken:  string;
  rishuReady:  boolean;
}

function firstRishuToken(items: KyukoRow[]): string {
  for (const row of items) {
    const uid = row?.userId != null ? String(row.userId).trim() : '';
    if (uid) return `${uid}_isRishu`;
  }
  return '';
}

function withRishuBootstrap(prev: KyukoPortalState, items: KyukoRow[]): Partial<KyukoPortalState> {
  if (prev.rishuReady) return {};
  const tok = firstRishuToken(items);
  if (!tok) return {};
  return { rishuToken: tok, rishuReady: true };
}

export function reduceKyukoPortalMessage(prev: KyukoPortalState, msg: PortalCapturedMessage): KyukoPortalState {
  if (msg.type === MSG.kinoMessage && msg.data !== undefined && isKinoMessagePayload(msg.data)) {
    return { ...prev, kinoData: msg.data };
  }
  if (msg.type === MSG.kyukoInfo && Array.isArray(msg.items)) {
    const items = msg.items as KyukoRow[];
    return { ...prev, kkRaw: items, ...withRishuBootstrap(prev, items) };
  }
  if (msg.type === MSG.hokoInfo && Array.isArray(msg.items)) {
    const items = msg.items as KyukoRow[];
    return { ...prev, hkRaw: items, ...withRishuBootstrap(prev, items) };
  }
  if (msg.type === MSG.kyoshitsuChange && Array.isArray(msg.items)) {
    const items = msg.items as KyukoRow[];
    return { ...prev, kcRaw: items, ...withRishuBootstrap(prev, items) };
  }
  return prev;
}

export const initialKyukoPortalState = (): KyukoPortalState => ({
  kinoData:   null,
  kkRaw:      null,
  hkRaw:      null,
  kcRaw:      null,
  rishuToken: '',
  rishuReady: false,
});
