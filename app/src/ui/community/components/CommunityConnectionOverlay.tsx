import { MotionIcon } from 'motion-icons-react';
import 'motion-icons-react/style.css';
import './community-connection-status.css';
import { cn } from '../../../lib/cn';

export function CommunityConnectionOverlay({
  ja,
  connecting,
  feedFailed,
  onRetry,
  onClose,
}: {
  ja: boolean;
  connecting: boolean;
  feedFailed: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  const title = connecting
    ? ja
      ? '再接続しています…'
      : 'Reconnecting…'
    : feedFailed
      ? ja
        ? 'コミュニティサーバーに接続できません'
        : 'Could not reach the community server'
      : ja
        ? 'コミュニティサーバーとの接続が切れました'
        : 'Disconnected from the community server';

  const body = connecting
    ? ja
      ? 'ネットワーク状態を確認しています。しばらくお待ちください。'
      : 'Checking the network. Please wait a moment.'
    : ja
      ? 'メンテナンス中の可能性があります。時間をおいてからもう一度お試しください。'
      : 'The service may be under maintenance. Please try again in a little while.';

  return (
    <div
      className="community-connection-overlay tw-absolute tw-inset-0 tw-z-[40] tw-grid tw-place-items-center tw-overflow-auto tw-bg-community-bg2 tw-p-6 tw-animate-community-fade-in max-[620px]:tw-p-3"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="community-connection-overlay-title"
      aria-describedby="community-connection-overlay-body"
    >
      <section
        className={cn(
          'tw-w-full tw-max-w-[450px] tw-rounded-[18px] tw-border tw-border-community-border tw-bg-community-bg tw-p-8 tw-text-center tw-shadow-community-modal tw-animate-community-dialog-in',
        )}
      >
        <span
          className={cn(
            'community-connection-status tw-mx-auto tw-mb-4 tw-grid tw-h-14 tw-w-14 tw-place-items-center tw-rounded-full tw-border tw-border-community-border tw-bg-community-bg3 tw-text-community-muted',
            connecting && 'tw-text-community-accent-light',
          )}
          aria-hidden
        >
          {connecting ? (
            <MotionIcon
              name="Loader2"
              animation="spin"
              size={26}
              weight="regular"
              color="currentColor"
              animationDuration={1400}
            />
          ) : (
            <MotionIcon
              name="WifiOff"
              animation="pulse"
              size={26}
              weight="regular"
              color="currentColor"
              animationDuration={2800}
            />
          )}
        </span>
        <p className="tw-mb-2 tw-text-[10px] tw-font-bold tw-tracking-[.12em] tw-text-community-accent-light">
          CONNECTION
        </p>
        <h2
          id="community-connection-overlay-title"
          className="tw-m-0 tw-text-[22px] tw-font-bold tw-leading-tight tw-text-community-bright"
        >
          {title}
        </h2>
        <p
          id="community-connection-overlay-body"
          className="tw-mb-0 tw-mt-3 tw-text-sm tw-leading-relaxed tw-text-community-muted"
        >
          {body}
        </p>
        <ul className="tw-mx-auto tw-mb-0 tw-mt-5 tw-max-w-[340px] tw-list-disc tw-space-y-1.5 tw-pl-5 tw-text-left tw-text-[13px] tw-leading-relaxed tw-text-community-muted">
          <li>
            {ja
              ? 'サーバー側の一時的な障害・メンテナンスの可能性'
              : 'A temporary outage or maintenance may be in progress'}
          </li>
          <li>
            {ja
              ? '校内ネットワークやVPNの状態もご確認ください'
              : 'Also check campus network or VPN connectivity'}
          </li>
        </ul>
        <div className="tw-mt-6 tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2">
          <button
            type="button"
            disabled={connecting}
            onClick={onRetry}
            className="tw-inline-flex tw-min-h-10 tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border-0 tw-bg-community-accent tw-px-4 tw-font-bold tw-text-community-on-accent tw-cursor-pointer disabled:tw-cursor-wait disabled:tw-opacity-70"
          >
            {ja ? (connecting ? '接続中…' : '再接続する') : connecting ? 'Connecting…' : 'Reconnect'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tw-inline-flex tw-min-h-10 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-px-4 tw-font-bold tw-text-community-text tw-cursor-pointer"
          >
            {ja ? 'コミュニティを閉じる' : 'Close community'}
          </button>
        </div>
      </section>
    </div>
  );
}
