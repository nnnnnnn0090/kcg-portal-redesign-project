/**
 * 拡張機能マニフェストの version を返す（コンテンツスクリプト等の拡張コンテキスト向け）。
 * 取得できない環境では空文字。
 */
export function readExtensionVersion(): string {
  try {
    const g = globalThis as typeof globalThis & {
      browser?: { runtime?: { getManifest?: () => chrome.runtime.Manifest | false | undefined } };
    };
    const m =
      (typeof g.browser !== 'undefined' && g.browser?.runtime?.getManifest?.()) ||
      (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.());
    const v = m && typeof m === 'object' ? m.version : undefined;
    return typeof v === 'string' ? v.trim() : '';
  } catch {
    return '';
  }
}
