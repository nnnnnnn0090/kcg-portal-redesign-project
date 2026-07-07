import { Busy, ErrorMessage } from '../components/FormUi';
import { COMMUNITY_DIALOG_SURFACE_CLASS } from './dialogStyles';

export function ConfirmDialog({
  ja,
  busy,
  error,
  close,
  confirm,
}: {
  ja: boolean;
  busy: boolean;
  error: string;
  close: () => void;
  confirm: () => void;
}) {
  return (
    <section
      className={`${COMMUNITY_DIALOG_SURFACE_CLASS} community-confirm tw-w-full tw-max-w-[430px] tw-p-8 tw-text-center [&>span]:tw-mx-auto [&>span]:tw-mb-4 [&>span]:tw-grid [&>span]:tw-h-[52px] [&>span]:tw-w-[52px] [&>span]:tw-place-items-center [&>span]:tw-rounded-full [&>span]:tw-bg-community-danger/10 [&>span]:tw-text-2xl [&>span]:tw-font-extrabold [&>span]:tw-text-community-danger [&_h2]:tw-m-0 [&_h2]:tw-text-[22px] [&_h2]:tw-text-community-bright [&_p]:tw-mb-6 [&_p]:tw-mt-2 [&_p]:tw-text-community-muted [&>div:last-child]:tw-flex [&>div:last-child]:tw-justify-center [&>div:last-child]:tw-gap-2 [&_button]:tw-inline-flex [&_button]:tw-min-h-10 [&_button]:tw-items-center [&_button]:tw-rounded-lg [&_button]:tw-border [&_button]:tw-border-community-border [&_button]:tw-bg-community-bg3 [&_button]:tw-px-4 [&_button]:tw-font-bold [&_button]:tw-text-community-text hover:[&_button]:tw-translate-y-[-1px] hover:[&_button]:tw-shadow-community-card [&_button.is-danger]:tw-text-white hover:[&_button.is-danger]:tw-brightness-110`}
    >
      <span>!</span>
      <h2>{ja ? '投稿を削除しますか？' : 'Delete this post?'}</h2>
      <p>{ja ? 'この操作は取り消せません。' : 'This action cannot be undone.'}</p>
      <ErrorMessage text={error} />
      <div>
        <button onClick={close}>{ja ? 'キャンセル' : 'Cancel'}</button>
        <button
          className={'is-danger tw-border-community-danger tw-bg-community-danger tw-text-white'}
          disabled={busy}
          onClick={confirm}
        >
          {busy ? <Busy /> : null}
          {ja ? '削除' : 'Delete'}
        </button>
      </div>
    </section>
  );
}
