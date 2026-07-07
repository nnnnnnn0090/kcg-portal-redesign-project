/**
 * 拡張機能インストールごとの匿名ユーザー ID とライフサイクル記録（F-042/F-043）。
 */

export { getOrCreateClientUserId } from '../lib/client-user-id';

export {
  getClientLifecycleTimestamps,
  type ClientLifecycleTimestamps,
} from '../lib/extension-client-lifecycle';

import { readExtensionVersion } from '../lib/extension-version';
import {
  CLIENT_INSTALL_AT_HEADER,
  CLIENT_LAST_UPDATED_AT_HEADER,
  CLIENT_USER_ID_HEADER,
  EXTENSION_VERSION_HEADER,
} from '../contract/origins';
import { getOrCreateClientUserId } from '../lib/client-user-id';
import { getClientLifecycleTimestamps } from '../lib/extension-client-lifecycle';

/** notice / survey / community-access 等へ付与するテレメトリヘッダー */
export async function buildClientTelemetryHeaders(): Promise<Record<string, string>> {
  const [userId, lifecycle] = await Promise.all([
    getOrCreateClientUserId(),
    getClientLifecycleTimestamps(),
  ]);
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    [CLIENT_USER_ID_HEADER]: userId,
    [CLIENT_INSTALL_AT_HEADER]: lifecycle.installAt,
    [CLIENT_LAST_UPDATED_AT_HEADER]: lifecycle.lastUpdatedAt,
  };
  const version = readExtensionVersion();
  if (version) headers[EXTENSION_VERSION_HEADER] = version;
  return headers;
}
