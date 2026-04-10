/**
 * ポータルの「前回ログイン」テキストを返すフック。
 * 素の HTML から初期値を読み取るため useState の初期化関数で一度だけ評価する。
 */

import { useState } from 'react';
import { portalLastLoginCollapsed } from '../lib/api';

/** 素 HTML の #lastLoginDt に基づく「前回ログイン …」表示用テキスト（無ければ空） */
export function useLastLogin(): string {
  const [text] = useState(() => {
    const raw = portalLastLoginCollapsed();
    return raw ? `前回ログイン ${raw}` : '';
  });
  return text;
}
