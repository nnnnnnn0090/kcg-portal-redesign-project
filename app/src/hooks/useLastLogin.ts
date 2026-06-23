/**
 * ポータルの「前回ログイン」テキストを返すフック。
 * 素の HTML から初期値を読み取るため useState の初期化関数で一度だけ評価する。
 */

import { useState } from 'react';
import { portalLastLoginCollapsed } from '../lib/api';
import { useI18n } from '../i18n';

/** 素 HTML の #lastLoginDt に基づく「前回ログイン …」表示用テキスト（無ければ空） */
export function useLastLogin(): string {
  const { t } = useI18n();
  const [raw] = useState(() => portalLastLoginCollapsed());
  return raw ? t.home.lastLogin(raw) : '';
}
