import { Busy, DialogHeader, ErrorMessage } from '../components/FormUi';
import { cn } from '../../../lib/cn';
import { COMMUNITY_DIALOG_SURFACE_CLASS } from './dialogStyles';

function previewText(text: string, max = 140): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="tw-h-[22px] tw-w-[22px] tw-fill-none tw-stroke-current"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function ConfirmDialog({
  ja,
  busy,
  error,
  close,
  confirm,
  title,
  message,
  detail,
  detailLabel,
}: {
  ja: boolean;
  busy: boolean;
  error: string;
  close: () => void;
  confirm: () => void;
  title?: { ja: string; en: string };
  message?: { ja: string; en: string };
  detail?: string;
  detailLabel?: { ja: string; en: string };
}) {
  const heading = title ? (ja ? title.ja : title.en) : ja ? '投稿を削除しますか？' : 'Delete this post?';
  const body = message
    ? ja
      ? message.ja
      : message.en
    : ja
      ? '削除すると元に戻せません。'
      : 'Deleted content cannot be restored.';
  const preview = previewText(detail ?? '');
  const previewHeading = detailLabel ? (ja ? detailLabel.ja : detailLabel.en) : ja ? '対象' : 'Target';

  return (
    <section
      className={cn(
        COMMUNITY_DIALOG_SURFACE_CLASS,
        'community-confirm tw-max-w-[480px] tw-overflow-hidden',
      )}
      role="alertdialog"
      aria-labelledby="community-confirm-title"
      aria-describedby="community-confirm-desc"
    >
      <DialogHeader
        title={ja ? '削除の確認' : 'Confirm deletion'}
        close={() => {
          if (!busy) close();
        }}
      />
      <div className="tw-grid tw-gap-5 tw-p-6">
        <div className="tw-flex tw-items-start tw-gap-4">
          <div
            className={
              'tw-grid tw-h-12 tw-w-12 tw-flex-none tw-place-items-center tw-rounded-2xl tw-border tw-border-[color-mix(in_srgb,var(--p-danger,#e54867)_28%,var(--p-border))] tw-bg-[color-mix(in_srgb,var(--p-danger,#e54867)_12%,var(--p-bg2))] tw-text-community-danger tw-shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_8%,transparent)]'
            }
          >
            <TrashIcon />
          </div>
          <div className="tw-min-w-0 tw-grid tw-gap-2">
            <h3
              id="community-confirm-title"
              className="tw-m-0 tw-text-lg tw-font-bold tw-leading-snug tw-text-community-bright"
            >
              {heading}
            </h3>
            <p
              id="community-confirm-desc"
              className="tw-m-0 tw-text-[13px] tw-leading-relaxed tw-text-community-muted"
            >
              {body}
            </p>
          </div>
        </div>

        {preview ? (
          <figure
            className={
              'tw-m-0 tw-overflow-hidden tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg2'
            }
          >
            <figcaption
              className={
                'tw-border-b tw-border-community-border tw-bg-community-bg3 tw-px-4 tw-py-2 tw-text-[11px] tw-font-bold tw-tracking-[0.08em] tw-text-community-muted tw-uppercase'
              }
            >
              {previewHeading}
            </figcaption>
            <blockquote className="tw-m-0 tw-max-h-28 tw-overflow-auto tw-whitespace-pre-wrap tw-break-words tw-px-4 tw-py-3 tw-text-[13px] tw-leading-relaxed tw-text-community-text">
              {preview}
            </blockquote>
          </figure>
        ) : null}

        <p
          className={
            'tw-m-0 tw-flex tw-items-start tw-gap-2.5 tw-rounded-xl tw-border tw-border-[color-mix(in_srgb,var(--p-danger,#e54867)_22%,var(--p-border))] tw-bg-[color-mix(in_srgb,var(--p-danger,#e54867)_7%,var(--p-bg))] tw-px-3.5 tw-py-3 tw-text-xs tw-leading-relaxed tw-text-community-muted'
          }
        >
          <span
            className={
              'tw-mt-px tw-grid tw-h-5 tw-w-5 tw-flex-none tw-place-items-center tw-rounded-full tw-bg-community-danger/15 tw-text-[11px] tw-font-extrabold tw-text-community-danger'
            }
            aria-hidden
          >
            !
          </span>
          <span>
            {ja
              ? 'この操作は取り消せません。必要な場合は、削除前に内容を控えてください。'
              : 'This action cannot be undone. Copy anything you need before deleting.'}
          </span>
        </p>

        <ErrorMessage text={error} />
      </div>
      <footer>
        <button type="button" onClick={close} disabled={busy}>
          {ja ? 'キャンセル' : 'Cancel'}
        </button>
        <button
          type="button"
          className={
            'tw-inline-flex tw-min-h-10 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-community-danger tw-bg-community-danger tw-px-4 tw-text-sm tw-font-bold tw-text-white hover:tw-translate-y-[-1px] hover:tw-brightness-110 hover:tw-shadow-community-card disabled:tw-translate-y-0 disabled:tw-brightness-100 disabled:tw-shadow-none'
          }
          disabled={busy}
          onClick={confirm}
        >
          {busy ? <Busy /> : null}
          {ja ? '削除する' : 'Delete'}
        </button>
      </footer>
    </section>
  );
}
