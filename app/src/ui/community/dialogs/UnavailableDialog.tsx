import { COMMUNITY_DIALOG_SURFACE_CLASS } from './dialogStyles';

export function UnavailableDialog({
  ja,
  close,
  title,
  body,
}: {
  ja: boolean;
  close: () => void;
  title?: { ja: string; en: string };
  body?: { ja: string; en: string };
}) {
  return (
    <section
      className={`${COMMUNITY_DIALOG_SURFACE_CLASS} community-unavailable tw-w-full tw-max-w-[450px] tw-p-8 tw-text-center [&>span]:tw-mx-auto [&>span]:tw-grid [&>span]:tw-h-[52px] [&>span]:tw-w-[52px] [&>span]:tw-place-items-center [&>span]:tw-rounded-full [&>span]:tw-border [&>span]:tw-border-community-border [&>span]:tw-bg-community-bg3 [&>span]:tw-text-2xl [&>span]:tw-font-extrabold [&>span]:tw-text-community-muted [&_h2]:tw-mb-2 [&_h2]:tw-mt-3 [&_h2]:tw-text-[22px] [&_h2]:tw-text-community-bright [&_p]:tw-m-0 [&_p]:tw-text-community-muted [&>button]:tw-mt-4 [&>button]:tw-min-h-10 [&>button]:tw-rounded-lg [&>button]:tw-border [&>button]:tw-border-community-border [&>button]:tw-bg-community-bg3 [&>button]:tw-px-4 [&>button]:tw-font-bold [&>button]:tw-text-community-text`}
      role="alertdialog"
      aria-labelledby="community-unavailable-title"
      aria-describedby="community-unavailable-body"
    >
      <span aria-hidden="true">!</span>
      <h2 id="community-unavailable-title">
        {title
          ? ja
            ? title.ja
            : title.en
          : ja
            ? '見つかりません'
            : 'Unavailable'}
      </h2>
      <p id="community-unavailable-body">
        {body
          ? ja
            ? body.ja
            : body.en
          : ja
            ? 'この投稿は削除されたか、表示できなくなりました。'
            : 'This post was deleted or is no longer available.'}
      </p>
      <button type="button" onClick={close}>
        {ja ? '閉じる' : 'Close'}
      </button>
    </section>
  );
}
