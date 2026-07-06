import { COMMUNITY_DIALOG_SURFACE_CLASS } from './dialogStyles';

export function SentDialog({ ja, close }: { ja: boolean; close: () => void }) {
  return (
    <section
      className={`${COMMUNITY_DIALOG_SURFACE_CLASS} community-sent tw-w-full tw-max-w-[450px] tw-p-8 tw-text-center [&>span]:tw-mx-auto [&>span]:tw-grid [&>span]:tw-h-[52px] [&>span]:tw-w-[52px] [&>span]:tw-place-items-center [&>span]:tw-rounded-full [&>span]:tw-border [&>span]:tw-border-[var(--p-accent-border)] [&>span]:tw-bg-community-accent-bg [&>span]:tw-text-2xl [&>span]:tw-font-extrabold [&>span]:tw-text-community-accent-light [&_h2]:tw-mb-2 [&_h2]:tw-mt-3 [&_h2]:tw-text-[22px] [&_h2]:tw-text-community-bright [&_p]:tw-m-0 [&_p]:tw-text-community-muted [&>button]:tw-mt-4 [&>button]:tw-min-h-10 [&>button]:tw-rounded-lg [&>button]:tw-border [&>button]:tw-border-[var(--p-accent-border)] [&>button]:tw-bg-community-accent-bg [&>button]:tw-px-4 [&>button]:tw-font-bold [&>button]:tw-text-community-accent-light`}
    >
      <span>✓</span>
      <h2>{ja ? '投稿を受け付けました' : 'Post submitted'}</h2>
      <p>{ja ? '運営の確認後に公開されます。' : 'It will be published after review.'}</p>
      <button onClick={close}>{ja ? '閉じる' : 'Close'}</button>
    </section>
  );
}
