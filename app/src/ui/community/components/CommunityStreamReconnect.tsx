import { Glyph } from './Glyph';
import { cn } from '../../../lib/cn';

export function CommunityStreamReconnect({
  visible,
  connecting,
  ja,
  onReconnect,
}: {
  visible: boolean;
  connecting: boolean;
  ja: boolean;
  onReconnect: () => void;
}) {
  if (!visible) return null;
  return (
    <div
      className={
        'community-stream-reconnect tw-pointer-events-none tw-absolute tw-bottom-5 tw-right-5 tw-z-[40] max-[620px]:tw-bottom-[calc(64px+1rem)]'
      }
    >
      <button
        type="button"
        className={cn(
          'community-stream-reconnect-btn tw-pointer-events-auto tw-inline-flex tw-min-h-10 tw-items-center tw-gap-2 tw-rounded-full tw-border tw-border-community-border tw-bg-[color-mix(in_srgb,var(--p-bg2)_92%,transparent)] tw-px-4 tw-text-xs tw-font-bold tw-text-community-text tw-shadow-[0_10px_30px_color-mix(in_srgb,#000_24%,transparent)] tw-backdrop-blur-sm tw-cursor-pointer hover:tw-border-community-accent hover:tw-text-community-accent-light disabled:tw-cursor-wait disabled:tw-opacity-80',
          connecting && 'is-connecting',
        )}
        onClick={onReconnect}
        disabled={connecting}
      >
        <Glyph name="refresh" />
        {connecting ? (ja ? '接続中…' : 'Connecting…') : ja ? '再接続' : 'Reconnect'}
      </button>
    </div>
  );
}
