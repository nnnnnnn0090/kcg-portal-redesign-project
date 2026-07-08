import { MotionIcon } from 'motion-icons-react';
import 'motion-icons-react/style.css';
import './community-connection-status.css';
import { cn } from '../../../lib/cn';

export function CommunityConnectionStatus({
  connecting,
  disconnected,
  ja,
  onReconnect,
}: {
  connecting: boolean;
  disconnected: boolean;
  ja: boolean;
  onReconnect: () => void;
}) {
  const mode = connecting ? 'connecting' : disconnected ? 'offline' : 'live';
  const label =
    mode === 'live'
      ? ja
        ? '接続済み'
        : 'Connected'
      : mode === 'connecting'
        ? ja
          ? '接続中…'
          : 'Connecting…'
        : ja
          ? '再接続'
          : 'Reconnect';
  const title =
    mode === 'live'
      ? ja
        ? 'リアルタイム同期：接続済み'
        : 'Realtime sync: connected'
      : mode === 'connecting'
        ? ja
          ? 'ネットワークに接続しています'
          : 'Connecting to the network'
        : ja
          ? '接続が切れました。タップして再接続'
          : 'Disconnected. Tap to reconnect';

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-live="polite"
      disabled={mode === 'connecting' || mode === 'live'}
      onClick={() => {
        if (mode === 'offline') onReconnect();
      }}
      className={cn(
        'community-connection-status tw-inline-flex tw-h-8 tw-shrink-0 tw-items-center tw-gap-1.5 tw-rounded-md tw-border-0 tw-bg-transparent tw-px-2 tw-text-[11px] tw-font-medium tw-transition-[color,background-color,opacity] tw-duration-150 max-[620px]:tw-h-8 max-[620px]:tw-w-8 max-[620px]:tw-justify-center max-[620px]:tw-gap-0 max-[620px]:tw-px-0',
        mode === 'live' && 'tw-cursor-default tw-text-community-muted',
        mode === 'connecting' && 'tw-cursor-wait tw-text-community-muted',
        mode === 'offline' &&
          'tw-cursor-pointer tw-text-community-muted hover:tw-bg-community-bg3 hover:tw-text-community-bright',
      )}
    >
      {mode === 'live' ? (
        <MotionIcon
          name="Wifi"
          animation="pulse"
          size={14}
          weight="regular"
          color="currentColor"
          animationDuration={2800}
          aria-hidden
        />
      ) : mode === 'connecting' ? (
        <MotionIcon
          name="Loader2"
          animation="spin"
          size={14}
          weight="regular"
          color="currentColor"
          animationDuration={1400}
          aria-hidden
        />
      ) : (
        <MotionIcon
          name="RefreshCw"
          animation="none"
          size={14}
          weight="regular"
          color="currentColor"
          interactive
          aria-hidden
        />
      )}
      <span className="max-[620px]:tw-sr-only">{label}</span>
    </button>
  );
}
