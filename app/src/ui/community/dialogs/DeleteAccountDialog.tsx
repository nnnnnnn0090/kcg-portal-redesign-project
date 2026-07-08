import { useState, type KeyboardEvent } from 'react';
import { Busy, DialogHeader, ErrorMessage, Field } from '../components/FormUi';
import { cn } from '../../../lib/cn';
import { COMMUNITY_DIALOG_SURFACE_CLASS } from './dialogStyles';
import { COMMUNITY_INPUT_LIMITS } from '../constants';

export function DeleteAccountDialog({
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
  confirm: (password: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = () => {
    if (busy || !password) return;
    confirm(password);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement | null;
    if (!target || target.tagName === 'BUTTON') return;
    event.preventDefault();
    submit();
  };

  return (
    <section
      className={cn(COMMUNITY_DIALOG_SURFACE_CLASS, 'community-delete-account tw-max-w-[480px]')}
      role="alertdialog"
      aria-labelledby="community-delete-account-title"
      aria-describedby="community-delete-account-desc"
      onKeyDown={handleKeyDown}
    >
      <DialogHeader
        title={ja ? 'アカウント削除' : 'Delete account'}
        close={() => {
          if (!busy) close();
        }}
      />
      <div className="tw-grid tw-gap-4 tw-p-6">
        <h3
          id="community-delete-account-title"
          className="tw-m-0 tw-text-lg tw-font-bold tw-text-community-bright"
        >
          {ja ? 'アカウントを本当に削除しますか？' : 'Delete your account permanently?'}
        </h3>
        <p id="community-delete-account-desc" className="tw-m-0 tw-text-[13px] tw-text-community-muted">
          {ja
            ? '投稿・プロフィール・フォロー関係は表示できなくなります。確認のためパスワードを入力してください。'
            : 'Your posts, profile, and follows will no longer be available. Enter your password to confirm.'}
        </p>
        <Field label={ja ? 'パスワード' : 'Password'}>
          <span className="tw-relative tw-block [&_input]:tw-pr-[52px] [&_button]:tw-absolute [&_button]:tw-bottom-1 [&_button]:tw-right-1 [&_button]:tw-h-8 [&_button]:tw-rounded-md [&_button]:tw-border-0 [&_button]:tw-bg-transparent [&_button]:tw-px-2 [&_button]:tw-text-xs [&_button]:tw-font-bold [&_button]:tw-text-community-muted [&_button]:tw-cursor-pointer hover:[&_button]:tw-bg-community-bg3">
            <input
              className={cn(
                !showPassword && 'is-masked [text-security:disc] [-webkit-text-security:disc]',
              )}
              type="text"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              maxLength={COMMUNITY_INPUT_LIMITS.password}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              autoFocus
              required
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)}>
              {showPassword ? (ja ? '隠す' : 'Hide') : ja ? '表示' : 'Show'}
            </button>
          </span>
        </Field>
        <ErrorMessage text={error} />
      </div>
      <footer>
        <button type="button" onClick={close} disabled={busy}>
          {ja ? 'キャンセル' : 'Cancel'}
        </button>
        <button
          type="button"
          className="tw-inline-flex tw-min-h-10 tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-community-danger tw-bg-community-danger tw-px-4 tw-text-sm tw-font-bold tw-text-white disabled:tw-opacity-55"
          disabled={busy || !password}
          onClick={submit}
        >
          {busy ? <Busy /> : null}
          {ja ? '削除する' : 'Delete'}
        </button>
      </footer>
    </section>
  );
}
