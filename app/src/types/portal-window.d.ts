/** `window.__portalCapturedApiHeaders` */

declare global {
  interface Window {
    __portalCapturedApiHeaders?: Record<string, string>;
  }
}

export {};
