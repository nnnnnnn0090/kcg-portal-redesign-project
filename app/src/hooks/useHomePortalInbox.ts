/**
 * ポータル MAIN ワールドから postMessage されるホーム向けデータを集約する。
 */

import { useState, useCallback } from 'react';
import { usePortalMessage } from './usePortalMessage';
import type { PortalCapturedMessage } from '../shared/types';
import { applyHomePortalMessage, type HomePortalInboxState } from '../lib/portal-messages-home';

const initialInbox: HomePortalInboxState = {
  kinoData:       null,
  kogiNews:       [],
  newTopicsItems: [],
  linkItems:      [],
};

export function useHomePortalInbox(): HomePortalInboxState {
  const [inbox, setInbox] = useState<HomePortalInboxState>(initialInbox);

  const onMessage = useCallback((msg: PortalCapturedMessage) => {
    setInbox((prev) => applyHomePortalMessage(prev, msg));
  }, []);

  usePortalMessage(onMessage);

  return inbox;
}
