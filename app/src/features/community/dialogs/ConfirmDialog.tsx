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
    <section className="community-dialog community-confirm">
      <span>!</span>
      <h2>{ja ? '投稿を削除しますか？' : 'Delete this post?'}</h2>
      <p>{ja ? 'この操作は取り消せません。' : 'This action cannot be undone.'}</p>
      <ErrorMessage text={error} />
      <div>
        <button onClick={close}>{ja ? 'キャンセル' : 'Cancel'}</button>
        <button className="is-danger" disabled={busy} onClick={confirm}>
          {busy ? <Busy /> : null}
          {ja ? '削除' : 'Delete'}
        </button>
      </div>
    </section>
  );
}
