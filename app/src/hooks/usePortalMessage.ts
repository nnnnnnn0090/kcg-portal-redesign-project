/**
 * `portal-hooks.content` が送る `postMessage` を受信するカスタムフックです。
 * マウント時にリプレイ要求を送るため、コンテンツスクリプト読み込み前に
 * 捕捉済みのメッセージも取りこぼしにくくします。
 */

import { useEffect, useRef } from 'react';
import { FETCH_HOOK } from '../shared/constants';
import type { PortalCapturedMessage } from '../shared/types';

export type { PortalCapturedMessage };

type Handler = (msg: PortalCapturedMessage) => void;

export interface UsePortalMessageOptions {
  /** 指定時はこれらの type のみ handler を呼ぶ（例: 単一カレンダーパネル） */
  msgTypes?: readonly string[];
}

/** 同一オリジンかつ `portal-hooks` が付与した `source` であることを確認します。 */
function isTrusted(e: MessageEvent): boolean {
  if (e.origin !== location.origin) return false;
  if (!e.data?.type) return false;
  if (e.data.type === FETCH_HOOK.replayRequest) return false;
  return e.data.source === FETCH_HOOK.source;
}

export function usePortalMessage(handler: Handler, options?: UsePortalMessageOptions): void {
  const types        = options?.msgTypes;
  const typesKey     = types?.join('\0') ?? '';
  const typesListRef = useRef(types);
  typesListRef.current = types;
  useEffect(() => {
    function onMessage(e: MessageEvent): void {
      if (!isTrusted(e)) return;
      const msg = e.data as PortalCapturedMessage;
      const t   = typesListRef.current;
      if (t && !t.includes(String(msg.type))) return;
      handler(msg);
    }
    window.addEventListener('message', onMessage);
    // マウント時に既存キャプチャの再送を要求する
    window.postMessage({ type: FETCH_HOOK.replayRequest }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, [handler, typesKey]);
}
