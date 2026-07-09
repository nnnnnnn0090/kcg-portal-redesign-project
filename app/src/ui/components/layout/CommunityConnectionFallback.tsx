import { MotionIcon } from 'motion-icons-react';
import 'motion-icons-react/style.css';
import './community-connection-status.css';
import { cn } from '../../../shared/cn';
import type { I18nMessages } from '../../../i18n/messages';

export type CommunityConnectionReason =
  | 'reconnecting'
  | 'health_failed'
  | 'gate_failed'
  | 'ready_timeout'
  | 'disconnected';

/** portal-community-server の CommunityConnectionOverlay と同じ見た目 */
export function CommunityConnectionFallback({
  messages,
  reason,
  onRetry,
  onClose,
}: {
  messages: I18nMessages['community']['connection'];
  reason: CommunityConnectionReason;
  onRetry: () => void;
  onClose: () => void;
}) {
  const connecting = reason === 'reconnecting';
  const title = connecting
    ? messages.reconnecting
    : reason === 'gate_failed'
      ? messages.gateFailed
      : reason === 'ready_timeout'
        ? messages.readyTimeout
        : reason === 'health_failed'
          ? messages.serverUnavailable
          : messages.disconnected;

  const body = connecting
    ? messages.checkingNetwork
    : reason === 'gate_failed'
      ? messages.gateFailed
      : reason === 'ready_timeout'
        ? messages.readyTimeout
        : messages.maintenanceHint;

  return (
    <div
      className="community-connection-overlay tw-grid tw-h-full tw-place-items-center tw-overflow-auto tw-bg-community-bg2 tw-p-6 tw-animate-community-fade-in max-[620px]:tw-p-3"
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
          <li>{messages.bulletOutage}</li>
          <li>{messages.bulletNetwork}</li>
        </ul>
        <div className="tw-mt-6 tw-flex tw-flex-wrap tw-items-center tw-justify-center tw-gap-2">
          <button
            type="button"
            disabled={connecting}
            onClick={onRetry}
            className="tw-inline-flex tw-min-h-10 tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border-0 tw-bg-community-accent tw-px-4 tw-font-bold tw-text-community-on-accent tw-cursor-pointer disabled:tw-cursor-wait disabled:tw-opacity-70"
          >
            {connecting ? messages.connecting : messages.reconnect}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tw-inline-flex tw-min-h-10 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-px-4 tw-font-bold tw-text-community-text tw-cursor-pointer"
          >
            {messages.close}
          </button>
        </div>
      </section>
    </div>
  );
}
