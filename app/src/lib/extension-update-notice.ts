/**
 * 拡張の manifest バージョンが前回より上がったときだけ一度だけ返すメッセージ（トースト用）。
 * 初回（記録なし）は記録のみ。ダウングレード時は記録を上書きしメッセージは返さない。
 */

import { readExtensionVersion } from './extension-version';
import storage from './storage';
import { SK } from '../shared/constants';

function semverSegments(v: string): number[] {
  return v.split('.').map((part) => {
    const n = parseInt(String(part).replace(/^(\d+).*/, '$1'), 10);
    return Number.isFinite(n) ? n : 0;
  });
}

/** セマンティック風の a > b（数値セグメント比較。プレリリース等は先頭数字のみ見る） */
function semverGreater(a: string, b: string): boolean {
  const pa = semverSegments(a);
  const pb = semverSegments(b);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return true;
    if (da < db) return false;
  }
  return false;
}

let inFlight: Promise<string> | null = null;

async function runConsume(): Promise<string> {
  const current = readExtensionVersion();
  if (!current) return '';

  const snap = await storage.get([SK.extensionVersionSeen]);
  const seenRaw = snap[SK.extensionVersionSeen];
  const seen = typeof seenRaw === 'string' ? seenRaw.trim() : '';

  if (!seen) {
    await storage.set({ [SK.extensionVersionSeen]: current });
    return '';
  }
  if (seen === current) return '';

  if (!semverGreater(current, seen)) {
    await storage.set({ [SK.extensionVersionSeen]: current });
    return '';
  }

  await storage.set({ [SK.extensionVersionSeen]: current });
  return `アップデートされました（v${current}）`;
}

/** 同時呼び出しは 1 本にまとめる（Strict Mode 等での二重取得を避ける） */
export function consumeExtensionUpdateToastMessage(): Promise<string> {
  if (!inFlight) {
    inFlight = runConsume().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
