/**
 * 拡張の manifest バージョンが上がったとき、Web API へ通知する（Web 側で Discord へ転送）。
 */

import { buildClientTelemetryHeaders } from '../services/client-identity';
import {
  CLIENT_PREVIOUS_VERSION_HEADER,
  EXTENSION_UPDATE_NOTIFY_URL,
  EXTENSION_VERSION_HEADER,
} from '../shared/constants';

/** 通知失敗はユーザー操作に影響させない */
export async function notifyExtensionInstallToWeb(currentVersion: string): Promise<void> {
  if (!currentVersion) return;

  try {
    const headers = await buildClientTelemetryHeaders('GET', '/extension-update');
    headers[EXTENSION_VERSION_HEADER] = currentVersion;

    await fetch(`${EXTENSION_UPDATE_NOTIFY_URL}?_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers,
    });
  } catch {
    /* ignore */
  }
}

/** 通知失敗はユーザー操作に影響させない */
export async function notifyExtensionUpdateToWeb(
  previousVersion: string,
  currentVersion: string,
): Promise<void> {
  if (!previousVersion || !currentVersion || previousVersion === currentVersion) return;

  try {
    const headers = await buildClientTelemetryHeaders('GET', '/extension-update');
    headers[EXTENSION_VERSION_HEADER] = currentVersion;
    headers[CLIENT_PREVIOUS_VERSION_HEADER] = previousVersion;

    await fetch(`${EXTENSION_UPDATE_NOTIFY_URL}?_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers,
    });
  } catch {
    /* ignore */
  }
}
