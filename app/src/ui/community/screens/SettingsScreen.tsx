import { useState, type KeyboardEvent } from 'react';
import { COMMUNITY_INPUT_LIMITS } from '../constants';
import { Busy, CharacterCount, ErrorMessage, Field } from '../components/FormUi';
import { cn } from '../../../lib/cn';

export function SettingsScreen({
  ja,
  busy,
  error,
  onChangePassword,
  onRequestDeleteAccount,
}: {
  ja: boolean;
  busy: boolean;
  error: string;
  onChangePassword: (values: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
  }) => Promise<void>;
  onRequestDeleteAccount: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [localError, setLocalError] = useState('');

  const passwordReady =
    Boolean(currentPassword.trim()) &&
    newPassword.length >= 8 &&
    newPasswordConfirmation.length >= 8 &&
    newPassword === newPasswordConfirmation &&
    currentPassword !== newPassword;

  const submitPassword = async () => {
    if (busy) return;
    setPasswordChanged(false);
    setLocalError('');
    if (!currentPassword.trim()) {
      setLocalError(ja ? '現在のパスワードを入力してください。' : 'Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setLocalError(
        ja
          ? '新しいパスワードは8文字以上にしてください。'
          : 'New password must be at least 8 characters.',
      );
      return;
    }
    if (newPasswordConfirmation.length < 8) {
      setLocalError(
        ja
          ? '確認用パスワードは8文字以上にしてください。'
          : 'Confirmation must be at least 8 characters.',
      );
      return;
    }
    if (newPassword !== newPasswordConfirmation) {
      setLocalError(ja ? '新しいパスワードが一致しません。' : 'New passwords do not match.');
      return;
    }
    if (currentPassword === newPassword) {
      setLocalError(
        ja
          ? '現在のパスワードと同じにはできません。'
          : 'New password must be different from the current one.',
      );
      return;
    }
    try {
      await onChangePassword({
        currentPassword,
        newPassword,
        newPasswordConfirmation,
      });
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setPasswordChanged(true);
    } catch {
      // parent exposes the API error via `error`
    }
  };

  const handleFormKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement | null;
    if (!target || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;
    event.preventDefault();
    void submitPassword();
  };

  return (
    <main className="community-scroll tw-min-h-0 tw-min-w-0 tw-overflow-auto [scrollbar-gutter:stable]">
      <div className="community-content tw-mx-auto tw-w-full tw-max-w-[760px] tw-px-6 tw-pb-14 tw-pt-6 max-[960px]:tw-px-4 max-[620px]:tw-px-3 max-[620px]:tw-pb-12">
        <header className="community-screen-heading tw-mb-5 [&_h1]:tw-m-0 [&_h1]:tw-text-[clamp(22px,2.5vw,28px)] [&_h1]:tw-font-bold [&_h1]:tw-text-community-bright [&_p]:tw-mb-0 [&_p]:tw-mt-2 [&_p]:tw-text-sm [&_p]:tw-text-community-muted">
          <h1>{ja ? '設定' : 'Settings'}</h1>
          <p>
            {ja
              ? 'パスワードの変更やアカウントの管理ができます。'
              : 'Change your password or manage your account.'}
          </p>
        </header>

        <section className="tw-mb-6 tw-rounded-2xl tw-border tw-border-community-border tw-bg-community-bg2 tw-p-5">
          <h2 className="tw-m-0 tw-text-lg tw-font-bold tw-text-community-bright">
            {ja ? 'パスワードの変更' : 'Change password'}
          </h2>
          <p className="tw-mb-4 tw-mt-1 tw-text-sm tw-text-community-muted">
            {ja
              ? '現在のパスワードを確認したうえで、新しいパスワードに更新します。他の端末のログインは切断されます。'
              : 'Confirm your current password, then set a new one. Other sessions will be signed out.'}
          </p>
          <div className="tw-grid tw-gap-4" role="form" onKeyDown={handleFormKeyDown}>
            <Field label={ja ? '現在のパスワード' : 'Current password'}>
              <input
                className={cn(
                  !showPassword && 'is-masked [text-security:disc] [-webkit-text-security:disc]',
                )}
                type="text"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.currentTarget.value)}
                maxLength={COMMUNITY_INPUT_LIMITS.password}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                required
              />
            </Field>
            <Field
              label={ja ? '新しいパスワード' : 'New password'}
              meta={
                <CharacterCount value={newPassword} max={COMMUNITY_INPUT_LIMITS.password} />
              }
            >
              <input
                className={cn(
                  !showPassword && 'is-masked [text-security:disc] [-webkit-text-security:disc]',
                )}
                type="text"
                minLength={8}
                maxLength={COMMUNITY_INPUT_LIMITS.password}
                value={newPassword}
                onChange={(event) => setNewPassword(event.currentTarget.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                placeholder={ja ? '8〜20文字' : '8-20 characters'}
                required
              />
            </Field>
            <Field
              label={ja ? '新しいパスワード（確認）' : 'Confirm new password'}
              meta={
                <CharacterCount
                  value={newPasswordConfirmation}
                  max={COMMUNITY_INPUT_LIMITS.password}
                />
              }
            >
              <input
                className={cn(
                  !showPassword && 'is-masked [text-security:disc] [-webkit-text-security:disc]',
                )}
                type="text"
                minLength={8}
                maxLength={COMMUNITY_INPUT_LIMITS.password}
                value={newPasswordConfirmation}
                onChange={(event) => setNewPasswordConfirmation(event.currentTarget.value)}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                placeholder={ja ? 'もう一度入力' : 'Enter it again'}
                required
              />
            </Field>
            <button
              type="button"
              className="tw-justify-self-start tw-border-0 tw-bg-transparent tw-p-0 tw-text-xs tw-font-bold tw-text-community-accent-light tw-cursor-pointer"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? (ja ? 'パスワードを隠す' : 'Hide passwords') : ja ? 'パスワードを表示' : 'Show passwords'}
            </button>
            {passwordChanged ? (
              <p className="tw-m-0 tw-rounded-lg tw-bg-community-accent-bg tw-px-3 tw-py-2 tw-text-[13px] tw-text-community-accent-light">
                {ja ? 'パスワードを変更しました。' : 'Password updated.'}
              </p>
            ) : null}
            <ErrorMessage text={localError || error} />
            <button
              type="button"
              disabled={busy || !passwordReady}
              onClick={() => void submitPassword()}
              className="tw-inline-flex tw-min-h-10 tw-w-fit tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border-0 tw-bg-community-accent tw-px-4 tw-font-bold tw-text-community-on-accent tw-cursor-pointer disabled:tw-cursor-not-allowed disabled:tw-opacity-55"
            >
              {busy ? <Busy /> : null}
              {ja ? 'パスワードを変更' : 'Update password'}
            </button>
          </div>
        </section>

        <section className="tw-rounded-2xl tw-border tw-border-community-danger/40 tw-bg-community-bg2 tw-p-5">
          <h2 className="tw-m-0 tw-text-lg tw-font-bold tw-text-community-bright">
            {ja ? '危険な操作' : 'Danger zone'}
          </h2>
          <p className="tw-mb-4 tw-mt-1 tw-text-sm tw-text-community-muted">
            {ja
              ? 'アカウントを削除すると、投稿やプロフィールは表示できなくなります。この操作は取り消せません。'
              : 'Deleting your account hides your posts and profile. This cannot be undone.'}
          </p>
          <button
            type="button"
            onClick={onRequestDeleteAccount}
            className="tw-inline-flex tw-min-h-10 tw-items-center tw-justify-center tw-rounded-lg tw-border tw-border-community-danger tw-bg-transparent tw-px-4 tw-font-bold tw-text-community-danger tw-cursor-pointer hover:tw-bg-community-danger/10"
          >
            {ja ? 'アカウントを削除…' : 'Delete account…'}
          </button>
        </section>
      </div>
    </main>
  );
}
