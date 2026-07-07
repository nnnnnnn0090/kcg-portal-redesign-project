import type { Worker } from '@playwright/test';

export { SK, INSTALL_OPEN_PENDING_KEY } from '../../src/contract/storage-keys';

export async function readExtensionStorage(
  worker: Worker,
  keys: string[],
): Promise<Record<string, unknown>> {
  return worker.evaluate(async (storageKeys) => {
    return chrome.storage.local.get(storageKeys);
  }, keys);
}

export async function writeExtensionStorage(
  worker: Worker,
  values: Record<string, unknown>,
): Promise<void> {
  await worker.evaluate(async (data) => {
    await chrome.storage.local.set(data);
  }, values);
}
