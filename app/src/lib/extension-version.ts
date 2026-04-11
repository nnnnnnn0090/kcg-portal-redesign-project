/**
 * 拡張機能マニフェストの version を返す（コンテンツスクリプト等の拡張コンテキスト向け）。
 * 取得できない環境では空文字。
 */
export function readExtensionVersion(): string {
  try {
    const g = globalThis as typeof globalThis & {
      browser?: { runtime?: { getManifest?: () => chrome.runtime.Manifest | undefined } };
    };
    const m =
      (typeof g.browser !== 'undefined' && g.browser?.runtime?.getManifest?.()) ||
      (typeof chrome !== 'undefined' && chrome.runtime?.getManifest?.());
    const v = m?.version;
    return typeof v === 'string' ? v.trim() : '';
  } catch {
    return '';
  }
}
