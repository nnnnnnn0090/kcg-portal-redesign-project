/**
 * 拡張機能の状態をポータル「マイリンク」の biko フィールドへ保存する。
 *
 * マーカーリンク（midashi: __KCGLMS::{n}）は UI から非表示。
 * biko は 200 文字制限のため、暗号化済みペイロードをチャンク分割して複数行に載せる。
 */

import type { Settings } from '../domain/settings';
import { SK } from '../contract/storage-keys';
import { PORTAL_HOSTNAME } from '../contract/origins';
import {
  pickPortalSyncedStorage,
  PORTAL_SYNCED_STORAGE_KEYS,
} from '../contract/portal-synced-storage';
import {
  getPortalExtensionMemorySnapshot,
  hydratePortalExtensionStore,
  registerPortalExtensionStoreMutator,
  setPortalExtensionStoreUpdatedAt,
} from '../platform/storage/portal-extension-store';
import {
  EMPTY_CUSTOM_THEMES,
  parseCustomThemeCollection,
  type StoredCustomThemeCollection,
} from '../domain/themes/custom-themes';
import type { CalendarWeekStart } from '../lib/date';
import { parseCalendarWeekStart } from '../lib/date';
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  type AppLanguage,
} from '../i18n/messages';
import {
  decodePortalSyncCompactPayload,
  encodePortalSyncCompactPayload,
} from '../lib/portal-sync-compact';
import {
  decryptPortalSyncPayload,
  encryptPortalSyncPayload,
  isEncryptedPortalSyncWire,
} from '../lib/portal-sync-crypto';
import { ensureClientUserIdInMemory } from '../lib/client-user-id';
import {
  fetchPortalUserLinks,
  nextPortalLinkNo,
  savePortalUserLinks,
  type PortalUserLink,
} from './user-html-link';

/** マイリンク UI に表示しない設定用マーカー */
export const PORTAL_SETTINGS_MARKER_PREFIX = '__KCGLMS::';

/** ポータル側の biko 上限（Profile 保存 API の検証） */
export const PORTAL_SETTINGS_BIKO_MAX = 200;

/** チャンク分割時の安全マージン */
export const PORTAL_SETTINGS_CHUNK_MAX = 190;

const PORTAL_SETTINGS_URL_PREFIX = 'https://home.kcg.ac.jp/portal/_kcglms/';

const PORTAL_EXTENSION_PAYLOAD_VERSION = 3 as const;
const PORTAL_SETTINGS_PAYLOAD_VERSION = 2 as const;

export { PORTAL_SYNCED_STORAGE_KEYS, isPortalSyncedStorageKey } from '../contract/portal-synced-storage';

export interface PortalExtensionSnapshot {
  updatedAt: number;
  storage: Record<string, unknown>;
}

/** @deprecated settings コンテキスト互換 */
export interface PortalSettingsSnapshot {
  updatedAt: number;
  settings: Settings;
  customThemes: StoredCustomThemeCollection;
}

interface PortalExtensionPayloadV3 {
  version: typeof PORTAL_EXTENSION_PAYLOAD_VERSION;
  updatedAt: number;
  storage: Record<string, unknown>;
}

interface PortalSettingsPayloadV2 {
  version: typeof PORTAL_SETTINGS_PAYLOAD_VERSION;
  updatedAt: number;
  settings: Settings;
  customThemes: StoredCustomThemeCollection;
}

interface PortalSettingsPayloadLegacyV1 {
  v: 1;
  u: number;
  s: {
    t: string;
    h: 0 | 1;
    k: 0 | 1;
    c: 0 | 1;
    a: 0 | 1;
    w2: 0 | 1;
    cp: 0 | 1;
    w: CalendarWeekStart;
    l: AppLanguage;
  };
  ct: StoredCustomThemeCollection;
}

let suppressPortalSync = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let listenerInstalled = false;
let bootstrapPromise: Promise<void> | null = null;

const PORTAL_EXTENSION_SAVE_DELAY_MS = 800;

export function isPortalSettingsMarkerLink(
  link: Pick<PortalUserLink, 'midashi' | 'url'>,
): boolean {
  return link.midashi.startsWith(PORTAL_SETTINGS_MARKER_PREFIX)
    || link.url.startsWith(PORTAL_SETTINGS_URL_PREFIX);
}

function canSyncPortalExtension(): boolean {
  return typeof location !== 'undefined' && location.hostname === PORTAL_HOSTNAME;
}

function fromBit(value: unknown, fallback: boolean): boolean {
  if (value === 1) return true;
  if (value === 0) return false;
  return fallback;
}

function markerMidashi(index: number): string {
  return `${PORTAL_SETTINGS_MARKER_PREFIX}${index}`;
}

function markerUrl(index: number): string {
  return `${PORTAL_SETTINGS_URL_PREFIX}${index}`;
}

function markerIndex(link: PortalUserLink): number {
  const fromTitle = link.midashi.slice(PORTAL_SETTINGS_MARKER_PREFIX.length);
  const parsed = Number(fromTitle);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  const fromUrl = link.url.slice(PORTAL_SETTINGS_URL_PREFIX.length);
  const parsedUrl = Number(fromUrl);
  return Number.isFinite(parsedUrl) && parsedUrl >= 0 ? parsedUrl : 0;
}

export async function writeSyncedLocalStorage(snapshot: PortalExtensionSnapshot): Promise<void> {
  suppressPortalSync = true;
  try {
    hydratePortalExtensionStore({
      updatedAt: snapshot.updatedAt,
      storage: pickPortalSyncedStorage(snapshot.storage),
    });
  } finally {
    suppressPortalSync = false;
  }
}

function settingsFromStorage(storageMap: Record<string, unknown>): Settings {
  return {
    theme: String(storageMap[SK.theme] ?? 'dark'),
    hideProfileName: Boolean(storageMap[SK.hideProfileName]),
    showKogiCalMascot: Boolean(storageMap[SK.showKogiCalMascot]),
    showHomeCornerCharacter: Boolean(storageMap[SK.showHomeCornerCharacter]),
    hideAssignmentCalendar: Boolean(storageMap[SK.hideAssignmentCalendar]),
    home2WebMailOverlay: storageMap[SK.home2WebMailOverlay] !== false,
    cplanOverlay: storageMap[SK.cplanOverlay] !== false,
    calendarWeekStart: parseCalendarWeekStart(storageMap[SK.calendarWeekStart]),
    language: normalizeLanguage(storageMap[SK.language] ?? DEFAULT_LANGUAGE),
  };
}

function settingsSnapshotToStorage(
  snapshot: PortalSettingsSnapshot,
): Record<string, unknown> {
  return {
    [SK.theme]: snapshot.settings.theme,
    [SK.hideProfileName]: snapshot.settings.hideProfileName,
    [SK.showKogiCalMascot]: snapshot.settings.showKogiCalMascot,
    [SK.showHomeCornerCharacter]: snapshot.settings.showHomeCornerCharacter,
    [SK.hideAssignmentCalendar]: snapshot.settings.hideAssignmentCalendar,
    [SK.home2WebMailOverlay]: snapshot.settings.home2WebMailOverlay,
    [SK.cplanOverlay]: snapshot.settings.cplanOverlay,
    [SK.calendarWeekStart]: snapshot.settings.calendarWeekStart,
    [SK.language]: snapshot.settings.language,
    [SK.customThemes]: snapshot.customThemes,
  };
}

function decodeLegacyV1(raw: PortalSettingsPayloadLegacyV1): PortalExtensionSnapshot | null {
  if (!raw?.s || typeof raw.u !== 'number') return null;
  const s = raw.s;
  return {
    updatedAt: raw.u,
    storage: settingsSnapshotToStorage({
      updatedAt: raw.u,
      settings: {
        theme: typeof s.t === 'string' ? s.t : 'dark',
        hideProfileName: fromBit(s.h, false),
        showKogiCalMascot: fromBit(s.k, false),
        showHomeCornerCharacter: fromBit(s.c, false),
        hideAssignmentCalendar: fromBit(s.a, false),
        home2WebMailOverlay: fromBit(s.w2, true),
        cplanOverlay: fromBit(s.cp, true),
        calendarWeekStart: parseCalendarWeekStart(s.w),
        language: normalizeLanguage(s.l ?? DEFAULT_LANGUAGE),
      },
      customThemes: parseCustomThemeCollection(raw.ct ?? EMPTY_CUSTOM_THEMES),
    }),
  };
}

function decodeSettingsPayloadV2(raw: PortalSettingsPayloadV2): PortalExtensionSnapshot | null {
  if (raw.version !== PORTAL_SETTINGS_PAYLOAD_VERSION) return null;
  if (typeof raw.updatedAt !== 'number' || !raw.settings) return null;
  const s = raw.settings;
  return {
    updatedAt: raw.updatedAt,
    storage: settingsSnapshotToStorage({
      updatedAt: raw.updatedAt,
      settings: {
        theme: typeof s.theme === 'string' ? s.theme : 'dark',
        hideProfileName: Boolean(s.hideProfileName),
        showKogiCalMascot: Boolean(s.showKogiCalMascot),
        showHomeCornerCharacter: Boolean(s.showHomeCornerCharacter),
        hideAssignmentCalendar: Boolean(s.hideAssignmentCalendar),
        home2WebMailOverlay: s.home2WebMailOverlay !== false,
        cplanOverlay: s.cplanOverlay !== false,
        calendarWeekStart: parseCalendarWeekStart(s.calendarWeekStart),
        language: normalizeLanguage(s.language ?? DEFAULT_LANGUAGE),
      },
      customThemes: parseCustomThemeCollection(raw.customThemes ?? EMPTY_CUSTOM_THEMES),
    }),
  };
}

function decodePayload(json: string): PortalExtensionSnapshot | null {
  const compact = decodePortalSyncCompactPayload(json);
  if (compact) {
    return {
      updatedAt: compact.updatedAt,
      storage: pickPortalSyncedStorage(compact.storage),
    };
  }

  try {
    const raw = JSON.parse(json) as
      | PortalExtensionPayloadV3
      | PortalSettingsPayloadV2
      | PortalSettingsPayloadLegacyV1;
    if (!raw || typeof raw !== 'object') return null;

    if ('version' in raw && raw.version === PORTAL_EXTENSION_PAYLOAD_VERSION) {
      if (typeof raw.updatedAt !== 'number' || !raw.storage || typeof raw.storage !== 'object') {
        return null;
      }
      return {
        updatedAt: raw.updatedAt,
        storage: pickPortalSyncedStorage(raw.storage as Record<string, unknown>),
      };
    }

    if ('version' in raw && raw.version === PORTAL_SETTINGS_PAYLOAD_VERSION) {
      return decodeSettingsPayloadV2(raw as PortalSettingsPayloadV2);
    }

    if ('v' in raw && raw.v === 1) {
      return decodeLegacyV1(raw as PortalSettingsPayloadLegacyV1);
    }

    return null;
  } catch {
    return null;
  }
}

function encodePayloadJson(snapshot: PortalExtensionSnapshot): string {
  return encodePortalSyncCompactPayload(
    snapshot.updatedAt,
    pickPortalSyncedStorage(snapshot.storage),
  );
}

async function encodePayloadWire(snapshot: PortalExtensionSnapshot): Promise<string> {
  const json = encodePayloadJson(snapshot);
  const encrypted = await encryptPortalSyncPayload(json);
  return encrypted ?? json;
}

async function decodePayloadWire(wire: string): Promise<PortalExtensionSnapshot | null> {
  if (isEncryptedPortalSyncWire(wire)) {
    const json = await decryptPortalSyncPayload(wire);
    if (!json) return null;
    return decodePayload(json);
  }
  return decodePayload(wire);
}

function splitIntoChunks(text: string): string[] {
  if (!text) return [''];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += PORTAL_SETTINGS_CHUNK_MAX) {
    chunks.push(text.slice(i, i + PORTAL_SETTINGS_CHUNK_MAX));
  }
  return chunks;
}

export async function decodePortalExtensionSnapshot(
  links: readonly PortalUserLink[],
): Promise<PortalExtensionSnapshot | null> {
  const markers = links
    .filter((link) => !link.delFlg && isPortalSettingsMarkerLink(link))
    .sort((a, b) => markerIndex(a) - markerIndex(b));
  if (markers.length === 0) return null;
  for (const marker of markers) {
    if (marker.biko.length > PORTAL_SETTINGS_BIKO_MAX) return null;
  }
  return decodePayloadWire(markers.map((marker) => marker.biko).join(''));
}

/** @deprecated PortalSettingsSnapshot 互換 */
export async function decodePortalSettingsSnapshot(
  links: readonly PortalUserLink[],
): Promise<PortalSettingsSnapshot | null> {
  const snapshot = await decodePortalExtensionSnapshot(links);
  if (!snapshot) return null;
  return {
    updatedAt: snapshot.updatedAt,
    settings: settingsFromStorage(snapshot.storage),
    customThemes: parseCustomThemeCollection(snapshot.storage[SK.customThemes] ?? EMPTY_CUSTOM_THEMES),
  };
}

export async function applyPortalExtensionMarkers(
  links: readonly PortalUserLink[],
  snapshot: PortalExtensionSnapshot,
): Promise<PortalUserLink[]> {
  const chunks = splitIntoChunks(await encodePayloadWire(snapshot));
  const nonMarkers = links.filter((link) => !isPortalSettingsMarkerLink(link));
  const allMarkers = links.filter((link) => isPortalSettingsMarkerLink(link));
  const activeMarkers = allMarkers.filter((link) => !link.delFlg);

  let nextLinkNo = nextPortalLinkNo(links);

  const updatedActiveMarkers: PortalUserLink[] = chunks.map((biko, index) => {
    const existing = activeMarkers.find((link) => markerIndex(link) === index);
    if (existing) {
      return {
        ...existing,
        midashi: markerMidashi(index),
        url: markerUrl(index),
        biko,
        delFlg: false,
      };
    }
    return {
      id: '',
      version: '',
      delFlg: false,
      linkNo: nextLinkNo++,
      midashi: markerMidashi(index),
      url: markerUrl(index),
      biko,
      order: -1,
    };
  });

  const retiredMarkers = activeMarkers
    .filter((link) => markerIndex(link) >= chunks.length)
    .map((link) => ({ ...link, delFlg: true }));

  const unchangedDeletedMarkers = allMarkers.filter((link) => link.delFlg);

  return [...nonMarkers, ...updatedActiveMarkers, ...retiredMarkers, ...unchangedDeletedMarkers];
}

export async function fetchPortalExtensionSnapshot(): Promise<PortalExtensionSnapshot | null> {
  const links = await fetchPortalUserLinks();
  return decodePortalExtensionSnapshot(links);
}

export async function savePortalExtensionSnapshot(snapshot: PortalExtensionSnapshot): Promise<void> {
  const links = await fetchPortalUserLinks();
  const next = await applyPortalExtensionMarkers(links, snapshot);
  await savePortalUserLinks(next);
}

async function snapshotFromSyncedLocalStorage(
  updatedAt = Date.now(),
): Promise<PortalExtensionSnapshot> {
  const memory = getPortalExtensionMemorySnapshot();
  return {
    updatedAt: updatedAt || memory.updatedAt || Date.now(),
    storage: pickPortalSyncedStorage(memory.storage),
  };
}

export async function savePortalExtensionSyncNow(): Promise<void> {
  if (!canSyncPortalExtension()) return;
  try {
    const snapshot = await snapshotFromSyncedLocalStorage(Date.now());
    await savePortalExtensionSnapshot(snapshot);
    suppressPortalSync = true;
    try {
      setPortalExtensionStoreUpdatedAt(snapshot.updatedAt);
    } finally {
      suppressPortalSync = false;
    }
  } catch {
    /* 未ログイン等 */
  }
}

export function schedulePortalExtensionSync(): void {
  if (suppressPortalSync || !canSyncPortalExtension()) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void savePortalExtensionSyncNow();
  }, PORTAL_EXTENSION_SAVE_DELAY_MS);
}

export function installPortalExtensionSyncListener(): () => void {
  if (listenerInstalled) return () => undefined;
  listenerInstalled = true;
  return registerPortalExtensionStoreMutator(() => {
    if (!suppressPortalSync) schedulePortalExtensionSync();
  });
}

/** 起動時に1回だけ: マイリンク復元 → clientUserId 確定 → 必要なら保存 */
export function ensurePortalExtensionBootstrapped(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runPortalExtensionBootstrap();
  }
  return bootstrapPromise;
}

/** @deprecated ensurePortalExtensionBootstrapped を使用 */
export async function bootstrapPortalExtensionSync(): Promise<void> {
  await ensurePortalExtensionBootstrapped();
}

async function runPortalExtensionBootstrap(): Promise<void> {
  installPortalExtensionSyncListener();

  let portal: PortalExtensionSnapshot | null = null;
  if (canSyncPortalExtension()) {
    try {
      portal = await fetchPortalExtensionSnapshot();
    } catch {
      portal = null;
    }
  }

  const memory = getPortalExtensionMemorySnapshot();
  if (portal && portal.updatedAt >= memory.updatedAt) {
    await writeSyncedLocalStorage(portal);
  } else if (
    Object.keys(memory.storage).length > 0
    && (!portal || memory.updatedAt > portal.updatedAt)
  ) {
    const toUpload: PortalExtensionSnapshot = {
      updatedAt: Date.now(),
      storage: memory.storage,
    };
    suppressPortalSync = true;
    try {
      await savePortalExtensionSnapshot(toUpload);
      setPortalExtensionStoreUpdatedAt(toUpload.updatedAt);
    } finally {
      suppressPortalSync = false;
    }
  }

  await ensureClientUserIdInMemory();

  if (!canSyncPortalExtension()) return;

  const after = getPortalExtensionMemorySnapshot();
  const portalHadId = Boolean(portal?.storage[SK.clientUserId]);
  const shouldPersist = !portal
    || after.updatedAt > (portal?.updatedAt ?? 0)
    || !portalHadId;
  if (!shouldPersist) return;

  suppressPortalSync = true;
  try {
    const snapshot = await snapshotFromSyncedLocalStorage(Date.now());
    await savePortalExtensionSnapshot(snapshot);
    setPortalExtensionStoreUpdatedAt(snapshot.updatedAt);
  } catch {
    /* 未ログイン等 */
  } finally {
    suppressPortalSync = false;
  }
}

export function parseSettingsFromExtensionStorage(
  storageMap: Record<string, unknown>,
): Settings {
  return settingsFromStorage(storageMap);
}

export function parseCustomThemesFromExtensionStorage(
  storageMap: Record<string, unknown>,
): StoredCustomThemeCollection {
  return parseCustomThemeCollection(storageMap[SK.customThemes] ?? EMPTY_CUSTOM_THEMES);
}
