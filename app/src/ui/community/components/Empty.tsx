import { Glyph } from './Glyph';

export function Empty({
  ja,
  loading,
  action,
}: {
  ja: boolean;
  loading?: boolean;
  action?: () => void;
}) {
  return (
    <div
      className={
        'community-empty tw-rounded-2xl tw-border tw-border-dashed tw-border-community-border tw-bg-community-bg2 tw-px-6 tw-py-10 tw-text-center [&>span]:tw-mx-auto [&>span]:tw-mb-3 [&>span]:tw-grid [&>span]:tw-h-11 [&>span]:tw-w-11 [&>span]:tw-place-items-center [&>span]:tw-rounded-full [&>span]:tw-bg-community-bg3 [&>span]:tw-text-community-accent-light [&_svg]:tw-h-5 [&_svg]:tw-w-5 [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [&_h2]:tw-m-0 [&_h2]:tw-text-lg [&_h2]:tw-text-community-bright [&_p]:tw-mx-0 [&_p]:tw-mb-4 [&_p]:tw-mt-1 [&_p]:tw-text-sm [&_p]:tw-text-community-muted [&>button]:tw-min-h-10 [&>button]:tw-whitespace-nowrap [&>button]:tw-rounded-lg [&>button]:tw-border-0 [&>button]:tw-bg-community-accent [&>button]:tw-px-4 [&>button]:tw-font-bold [&>button]:tw-text-community-on-accent [&>button]:tw-cursor-pointer'
      }
    >
      <span>
        <Glyph name="image" />
      </span>
      <h2>
        {loading
          ? ja
            ? '読み込んでいます'
            : 'Loading'
          : ja
            ? '投稿はまだありません'
            : 'No posts yet'}
      </h2>
      {!loading ? (
        <p>{ja ? '最初の活動を共有してみませんか。' : 'Share the first campus activity.'}</p>
      ) : null}
      {action ? <button onClick={action}>{ja ? '投稿を作る' : 'Create post'}</button> : null}
    </div>
  );
}
