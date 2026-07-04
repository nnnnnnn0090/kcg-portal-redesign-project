import { Busy, ErrorMessage } from '../components/FormUi';

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
      className={
        'community-dialog tw-max-h-[min(90vh,900px)] tw-w-full tw-max-w-[620px] tw-overflow-auto tw-rounded-[18px] tw-border tw-border-[var(--p-border-hover)] tw-bg-community-bg tw-shadow-community-modal tw-animate-community-dialog-in max-[620px]:tw-max-h-[calc(100vh-24px)] max-[620px]:tw-rounded-2xl [&>footer]:tw-flex [&>footer]:tw-justify-end [&>footer]:tw-gap-2 [&>footer]:tw-border-t [&>footer]:tw-border-community-border [&>footer]:tw-bg-community-bg2 [&>footer]:tw-p-4 [&>footer>button]:tw-inline-flex [&>footer>button]:tw-min-h-10 [&>footer>button]:tw-appearance-none [&>footer>button]:tw-items-center [&>footer>button]:tw-justify-center [&>footer>button]:tw-gap-2 [&>footer>button]:tw-rounded-lg [&>footer>button]:tw-border [&>footer>button]:tw-border-community-border [&>footer>button]:tw-bg-community-bg3 [&>footer>button]:tw-px-4 [&>footer>button]:tw-text-sm [&>footer>button]:tw-font-bold [&>footer>button]:tw-text-community-text [&>footer>button]:tw-cursor-pointer [&>footer>button.is-primary]:tw-border-community-accent [&>footer>button.is-primary]:tw-bg-community-accent [&>footer>button.is-primary]:tw-text-community-bg [&_button:disabled]:tw-cursor-not-allowed [&_button:disabled]:tw-opacity-[.55] community-confirm tw-w-full tw-max-w-[430px] tw-p-8 tw-text-center [&>span]:tw-mx-auto [&>span]:tw-mb-4 [&>span]:tw-grid [&>span]:tw-h-[52px] [&>span]:tw-w-[52px] [&>span]:tw-place-items-center [&>span]:tw-rounded-full [&>span]:tw-bg-community-danger/10 [&>span]:tw-text-2xl [&>span]:tw-font-extrabold [&>span]:tw-text-community-danger [&_h2]:tw-m-0 [&_h2]:tw-text-[22px] [&_h2]:tw-text-community-bright [&_p]:tw-mb-6 [&_p]:tw-mt-2 [&_p]:tw-text-community-muted [&>div:last-child]:tw-flex [&>div:last-child]:tw-justify-center [&>div:last-child]:tw-gap-2 [&_button]:tw-inline-flex [&_button]:tw-min-h-10 [&_button]:tw-items-center [&_button]:tw-rounded-lg [&_button]:tw-border [&_button]:tw-border-community-border [&_button]:tw-bg-community-bg3 [&_button]:tw-px-4 [&_button]:tw-font-bold'
      }
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
