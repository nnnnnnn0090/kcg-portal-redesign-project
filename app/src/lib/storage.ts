/**
 * chrome.storage.local の Promise ラッパー。
 * Chrome (MV3) と Firefox (MV2) の両方に対応する。
 */
const storage = {
  get(keys: string | string[]): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      try {
        if (typeof browser !== 'undefined' && browser.storage?.local) {
          browser.storage.local.get(keys).then(resolve).catch(() => resolve({}));
          return;
        }
      } catch {}
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.get(keys, (r) => resolve(r ?? {}));
          return;
        }
      } catch {}
      resolve({});
    });
  },

  set(obj: Record<string, unknown>): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (typeof browser !== 'undefined' && browser.storage?.local) {
          browser.storage.local.set(obj).then(resolve).catch(resolve);
          return;
        }
      } catch {}
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.set(obj, resolve);
          return;
        }
      } catch {}
      resolve();
    });
  },
};

export default storage;
