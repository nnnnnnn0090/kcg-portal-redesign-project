/**
 * 拡張の manifest バージョンが上がったとき、Web API へ通知する（Web 側で Discord へ転送）。
 */

import { getOrCreateClientUserId } from './client-user-id';
import { getClientLifecycleTimestamps } from './extension-client-lifecycle';
import {
  CLIENT_INSTALL_AT_HEADER,
  CLIENT_LAST_UPDATED_AT_HEADER,
  CLIENT_PREVIOUS_VERSION_HEADER,
  CLIENT_USER_ID_HEADER,
  EXTENSION_UPDATE_NOTIFY_URL,
  EXTENSION_VERSION_HEADER,
} from '../shared/constants';

/** 通知失敗はユーザー操作に影響させない */
export async function notifyExtensionUpdateToWeb(
  previousVersion: string,
  currentVersion: string,
): Promise<void> {
  if (!previousVersion || !currentVersion || previousVersion === currentVersion) return;

  try {
    const [userId, lifecycle] = await Promise.all([
      getOrCreateClientUserId(),
      getClientLifecycleTimestamps(),
    ]);

    await fetch(`${EXTENSION_UPDATE_NOTIFY_URL}?_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        [CLIENT_USER_ID_HEADER]: userId,
        [EXTENSION_VERSION_HEADER]: currentVersion,
        [CLIENT_PREVIOUS_VERSION_HEADER]: previousVersion,
        [CLIENT_INSTALL_AT_HEADER]: lifecycle.installAt,
        [CLIENT_LAST_UPDATED_AT_HEADER]: lifecycle.lastUpdatedAt,
      },
    });
  } catch {
    /* ignore */
  }
}
