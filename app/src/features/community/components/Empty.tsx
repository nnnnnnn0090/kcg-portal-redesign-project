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
    <div className="community-empty">
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
