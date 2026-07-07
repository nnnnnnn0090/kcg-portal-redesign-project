/**
 * オーバーレイから MAIN ワールドの pageFetch ブリッジへ再取得を依頼する（F-005）。
 */

import { postPageFetchRequest } from '../platform/messaging/page-bus';

/** pageFetch 用 postMessage（portal-hooks のブリッジが処理） */
export function pageFetch(url: string): void {
  postPageFetchRequest(String(url));
}
