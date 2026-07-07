/**
 * 配布 zip ビルド時に `VITE_TELEMETRY_HMAC_SECRET` を bundle へ注入（Web の TELEMETRY_HMAC_SECRET と同一）。
 */

import { isPortalDistributionBuild } from './distribution-build';

/** 配布 zip のみ秘密鍵を返す。dev zip / wxt dev は null。 */
export function readEmbeddedTelemetrySecret(): string | null {
  if (!isPortalDistributionBuild()) return null;
  const injected = import.meta.env.VITE_TELEMETRY_HMAC_SECRET;
  if (typeof injected === 'string' && injected.trim().length >= 16) {
    return injected.trim();
  }
  return null;
}
