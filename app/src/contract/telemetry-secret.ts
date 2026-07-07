/**
 * 配布 zip のみ埋め込む固定 HMAC 秘密鍵（Web の TELEMETRY_HMAC_SECRET と同一）。
 */

import { isPortalDistributionBuild } from './distribution-build';

const EMBEDDED_PART_A = 'a2NnLWtwbC10ZWxtLXNlYy12';
const EMBEDDED_PART_B = 'MS0yMDI2LTA3LXBvcnRhbC1yZWRlc2lnbg==';

function decodeEmbeddedParts(parts: readonly string[]): string {
  return parts.map((part) => atob(part)).join('');
}

/** 配布 zip のみ秘密鍵を返す。dev zip / wxt dev は null。 */
export function readEmbeddedTelemetrySecret(): string | null {
  if (!isPortalDistributionBuild()) return null;
  return decodeEmbeddedParts([EMBEDDED_PART_A, EMBEDDED_PART_B]);
}
