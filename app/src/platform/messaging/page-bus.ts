/**
 * isolated ワールド用 postMessage バス（§10.2）。
 */

import { FETCH_HOOK } from '../../contract/messages';
import { isPageMessage, type PageMessage } from './types';

const TARGET_ORIGIN = '*';

export function postPageMessage(msg: PageMessage): void {
  try {
    window.postMessage(msg, TARGET_ORIGIN);
  } catch { /* ignore */ }
}

export function postReplayRequest(): void {
  postPageMessage({ type: FETCH_HOOK.replayRequest });
}

export function postPageFetchRequest(url: string): void {
  postPageMessage({ type: FETCH_HOOK.pageFetch, url });
}

export function postLogoffTrigger(): void {
  postPageMessage({ type: FETCH_HOOK.logoffTrigger });
}

export function listenPageMessages(
  handler: (msg: PageMessage, event: MessageEvent) => void,
): () => void {
  const listener = (event: MessageEvent) => {
    if (event.source !== window) return;
    if (!isPageMessage(event.data)) return;
    handler(event.data, event);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
