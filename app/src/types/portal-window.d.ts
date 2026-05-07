/**
 * `portal-hooks` が捕捉した API リクエストヘッダーを、ページの `window` に載せるための宣言です。
 * `pageFetch` ブリッジが再取得時に参照します。
 */

declare global {
  interface Window {
    __portalCapturedApiHeaders?: Record<string, string>;
  }
}

export {};
