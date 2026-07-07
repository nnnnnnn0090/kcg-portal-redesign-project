/** 拡張テレメトリ署名（Web `lib/contract/telemetry-auth.ts` と一致） */

export const CLIENT_TIMESTAMP_HEADER = 'X-KCG-Portal-Timestamp' as const;

export const CLIENT_SIGNATURE_HEADER = 'X-KCG-Portal-Signature' as const;

export const TELEMETRY_MAX_AGE_MS = 10_000;

export const TELEMETRY_MAX_FUTURE_SKEW_MS = 5_000;

export function buildTelemetryCanonicalString(
  timestampMs: string,
  method: string,
  pathname: string,
): string {
  return `${timestampMs}\n${method.toUpperCase()}\n${pathname}`;
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const keyBytes = new TextEncoder().encode(secret);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
}

export async function signTelemetryRequest(
  secret: string,
  method: string,
  pathname: string,
  timestampMs = Date.now(),
): Promise<{ timestamp: string; signature: string }> {
  const key = await importHmacKey(secret);
  const timestamp = String(timestampMs);
  const canonical = buildTelemetryCanonicalString(timestamp, method, pathname);
  const signatureBytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonical)),
  );
  return { timestamp, signature: bytesToBase64Url(signatureBytes) };
}
