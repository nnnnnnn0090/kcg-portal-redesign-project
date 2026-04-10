/**
 * 開発時のみのログ。本番ビルドでは no-op に近い（import.meta.env.DEV が false）。
 */

export function devLog(...args: unknown[]): void {
  if (import.meta.env?.DEV) console.log('[kcg-portal]', ...args);
}

export function devWarn(...args: unknown[]): void {
  if (import.meta.env?.DEV) console.warn('[kcg-portal]', ...args);
}
