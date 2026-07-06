import { useState, type KeyboardEvent } from 'react';
import { Busy, CharacterCount, ErrorMessage, Field } from '../components/FormUi';
import { Glyph } from '../components/Glyph';
import type { ModalLayerProps } from './types';
import { cn } from '../../../lib/cn';
import { COMMUNITY_INPUT_LIMITS } from '../constants';

export function AuthDialog(props: ModalLayerProps & { mode: 'login' | 'register' }) {
  const { mode, ja, busy, error, close, setAuthMode, authenticate } = props;
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const registering = mode === 'register';

  const selectAuthTab = (nextMode: 'login' | 'register', target?: HTMLButtonElement) => {
    setAuthMode(nextMode);
    target?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
    );
    const target = event.key === 'ArrowLeft' || event.key === 'Home' ? buttons[0] : buttons[1];
    selectAuthTab(target?.dataset.mode === 'register' ? 'register' : 'login', target);
  };

  return (
    <form
      className={cn(
        'community-dialog community-auth tw-relative tw-max-h-[min(92vh,820px)] tw-w-full tw-overflow-hidden tw-rounded-2xl tw-border-2 tw-border-community-border tw-bg-community-bg tw-shadow-[0_0_0_1px_color-mix(in_srgb,var(--p-accent)_18%,transparent),0_22px_80px_color-mix(in_srgb,#000_34%,transparent)] tw-animate-community-dialog-in max-[520px]:tw-max-h-[calc(100vh-16px)] max-[520px]:tw-rounded-xl',
        registering
          ? 'tw-grid tw-max-w-[760px] tw-grid-cols-[220px_minmax(0,1fr)] max-[720px]:tw-block max-[720px]:tw-max-w-[480px]'
          : 'tw-max-w-[420px]',
      )}
      method="post"
      autoComplete="off"
      data-1p-ignore
      data-lpignore="true"
      data-bwignore="true"
      onSubmitCapture={(event) => event.preventDefault()}
      onSubmit={(event) => authenticate(event, mode)}
    >
      <button
        className={
          'tw-absolute tw-right-3 tw-top-3 tw-z-[5] tw-grid tw-h-10 tw-w-10 tw-place-items-center tw-rounded-lg tw-border-0 tw-bg-transparent tw-p-0 tw-text-community-muted tw-cursor-pointer hover:tw-bg-community-bg3 hover:tw-text-community-text focus-visible:tw-bg-community-bg3 focus-visible:tw-text-community-text focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-community-accent-bg [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-current'
        }
        type="button"
        onClick={close}
        aria-label={ja ? '閉じる' : 'Close'}
      >
        <Glyph name="close" />
      </button>

      {registering ? (
        <aside
          className={
            'tw-flex tw-min-w-0 tw-flex-col tw-gap-7 tw-border-r tw-border-community-border tw-bg-community-bg2 tw-p-6 max-[720px]:tw-hidden [&_img]:tw-h-10 [&_img]:tw-w-10 [&_img]:tw-object-contain [&_strong]:tw-text-sm [&_strong]:tw-text-community-bright [&_small]:tw-text-[11px] [&_small]:tw-font-bold [&_small]:tw-text-community-accent-light [&_h2]:tw-m-0 [&_h2]:tw-text-xl [&_h2]:tw-leading-snug [&_h2]:tw-text-community-bright [&_p]:tw-m-0 [&_p]:tw-text-[13px] [&_p]:tw-leading-relaxed [&_p]:tw-text-community-muted'
          }
        >
          <div className={'tw-flex tw-items-center tw-gap-3'}>
            <img src={browser.runtime.getURL('/community/activity-icon.png')} alt="" />
            <strong>{ja ? 'みんなの活動' : 'Campus Community'}</strong>
          </div>
          <div className={'tw-grid tw-gap-3'}>
            <small>CAMPUS COMMUNITY</small>
            <h2>{ja ? 'キャンパスの日常を、もっと近くに。' : 'Campus life, closer together.'}</h2>
            <p>
              {ja
                ? '学生の活動を見つけて、あなたの活動も共有できます。'
                : 'Discover student activities and share your own.'}
            </p>
          </div>
        </aside>
      ) : null}

      <section
        className={
          'tw-max-h-[min(92vh,820px)] tw-min-w-0 tw-overflow-y-auto tw-px-7 tw-pb-7 tw-pt-6 max-[520px]:tw-px-4 max-[520px]:tw-pb-5 max-[520px]:tw-pt-5'
        }
      >
        <div
          className={cn(
            'tw-mb-5 tw-flex tw-items-center tw-gap-3 [&_img]:tw-h-9 [&_img]:tw-w-9 [&_img]:tw-object-contain [&_strong]:tw-text-sm [&_strong]:tw-text-community-bright',
            registering && 'min-[721px]:tw-hidden',
          )}
        >
          <img src={browser.runtime.getURL('/community/activity-icon.png')} alt="" />
          <strong>{ja ? 'みんなの活動' : 'Campus Community'}</strong>
        </div>

        <header
          className={
            'tw-pr-10 [&_h2]:tw-m-0 [&_h2]:tw-text-2xl [&_h2]:tw-leading-tight [&_h2]:tw-text-community-bright [&_p]:tw-mb-0 [&_p]:tw-mt-2 [&_p]:tw-text-sm [&_p]:tw-text-community-muted'
          }
        >
          <h2>
            {registering
              ? ja
                ? 'アカウントを作成'
                : 'Create an account'
              : ja
                ? 'ログイン'
                : 'Log in'}
          </h2>
          <p>
            {registering
              ? ja
                ? '投稿やいいね、フォローができるようになります。'
                : 'Post, like and follow other members.'
              : ja
                ? '登録したユーザーIDで続けます。'
                : 'Continue with your user ID.'}
          </p>
        </header>

        <div
          className={
            'tw-mb-5 tw-mt-5 tw-flex tw-gap-5 tw-border-b tw-border-community-border [&_button]:tw-relative [&_button]:tw-min-h-10 [&_button]:tw-border-0 [&_button]:tw-bg-transparent [&_button]:tw-px-0 [&_button]:tw-pb-2 [&_button]:tw-text-sm [&_button]:tw-font-bold [&_button]:tw-text-community-muted [&_button]:tw-cursor-pointer hover:[&_button]:tw-text-community-bright after:[&_button]:tw-absolute after:[&_button]:tw-inset-x-0 after:[&_button]:tw-bottom-[-1px] after:[&_button]:tw-h-0.5 after:[&_button]:tw-scale-x-0 after:[&_button]:tw-bg-community-accent after:[&_button]:tw-transition-transform [&_button.is-active]:tw-text-community-bright after:[&_button.is-active]:tw-scale-x-100 focus-visible:[&_button]:tw-rounded-sm focus-visible:[&_button]:tw-outline-none focus-visible:[&_button]:tw-ring-2 focus-visible:[&_button]:tw-ring-community-accent-bg'
          }
          role="tablist"
          aria-label={ja ? '認証画面の切り替え' : 'Authentication view'}
        >
          <button
            type="button"
            role="tab"
            data-mode="register"
            aria-selected={registering}
            tabIndex={registering ? 0 : -1}
            className={cn(registering && 'is-active')}
            onClick={(event) => selectAuthTab('register', event.currentTarget)}
            onKeyDown={handleTabKeyDown}
          >
            {ja ? '新規登録' : 'Sign up'}
          </button>
          <button
            type="button"
            role="tab"
            data-mode="login"
            aria-selected={!registering}
            tabIndex={!registering ? 0 : -1}
            className={cn(!registering && 'is-active')}
            onClick={(event) => selectAuthTab('login', event.currentTarget)}
            onKeyDown={handleTabKeyDown}
          >
            {ja ? 'ログイン' : 'Log in'}
          </button>
        </div>

        <div className={'tw-grid tw-gap-4'}>
          {registering ? (
            <Field
              label={ja ? '表示名' : 'Display name'}
              meta={<CharacterCount value={displayName} max={COMMUNITY_INPUT_LIMITS.displayName} />}
            >
              <input
                name="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.currentTarget.value)}
                maxLength={COMMUNITY_INPUT_LIMITS.displayName}
                autoComplete="name"
                data-1p-ignore
                data-lpignore="true"
                placeholder={ja ? 'みんなに表示する名前' : 'Name shown to others'}
                required
              />
            </Field>
          ) : null}

          <Field
            label={ja ? 'ユーザーID' : 'User ID'}
            meta={<CharacterCount value={loginId} max={COMMUNITY_INPUT_LIMITS.loginId} />}
          >
            <input
              name="communityLoginId"
              minLength={4}
              maxLength={COMMUNITY_INPUT_LIMITS.loginId}
              value={loginId}
              onChange={(event) => setLoginId(event.currentTarget.value)}
              pattern="[A-Za-z0-9_.-]+"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore="true"
              placeholder={
                registering ? (ja ? '半角英数字・記号で4〜12文字' : '4-12 characters') : ''
              }
              autoFocus
              required
            />
          </Field>

          <Field
            label={ja ? 'パスワード' : 'Password'}
            meta={<CharacterCount value={password} max={COMMUNITY_INPUT_LIMITS.password} />}
          >
            <span
              className={
                'tw-relative tw-block [&_input]:tw-pr-[52px] [&_button]:tw-absolute [&_button]:tw-bottom-1 [&_button]:tw-right-1 [&_button]:tw-h-8 [&_button]:tw-rounded-md [&_button]:tw-border-0 [&_button]:tw-bg-transparent [&_button]:tw-px-2 [&_button]:tw-text-xs [&_button]:tw-font-bold [&_button]:tw-text-community-muted [&_button]:tw-cursor-pointer hover:[&_button]:tw-bg-community-bg3 hover:[&_button]:tw-text-community-text'
              }
            >
              <input
                className={cn(
                  !showPassword && 'is-masked [text-security:disc] [-webkit-text-security:disc]',
                )}
                name="communitySecret"
                type="text"
                minLength={8}
                maxLength={COMMUNITY_INPUT_LIMITS.password}
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
                placeholder={registering ? (ja ? '8〜20文字' : '8-20 characters') : ''}
                required
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? (ja ? '隠す' : 'Hide') : ja ? '表示' : 'Show'}
              </button>
            </span>
          </Field>

          {registering ? (
            <Field
              label={ja ? 'パスワード（確認）' : 'Confirm password'}
              meta={
                <CharacterCount
                  value={passwordConfirmation}
                  max={COMMUNITY_INPUT_LIMITS.password}
                />
              }
            >
              <input
                className={cn(
                  !showPassword && 'is-masked [text-security:disc] [-webkit-text-security:disc]',
                )}
                name="communitySecretConfirmation"
                type="text"
                minLength={8}
                maxLength={COMMUNITY_INPUT_LIMITS.password}
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.currentTarget.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
                placeholder={ja ? 'もう一度入力' : 'Enter it again'}
                required
              />
            </Field>
          ) : null}

          {registering ? (
            <p
              className={
                'tw-m-0 tw-rounded-md tw-bg-community-accent-bg tw-px-3 tw-py-2 tw-text-xs tw-leading-relaxed tw-text-community-muted'
              }
            >
              {ja
                ? '学校のIDやパスワードとは別のものを設定してください。'
                : 'Use credentials different from your school account.'}
            </p>
          ) : null}

          <ErrorMessage text={error} />
          <button
            className={
              'tw-mt-1 tw-inline-flex tw-min-h-11 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border tw-border-community-accent tw-bg-community-accent tw-px-4 tw-font-bold tw-text-community-on-accent tw-cursor-pointer hover:tw-opacity-90 focus-visible:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-community-accent-bg disabled:tw-cursor-not-allowed disabled:tw-opacity-55'
            }
            disabled={busy}
          >
            {busy ? <Busy /> : null}
            {registering
              ? ja
                ? 'アカウントを作成'
                : 'Create account'
              : ja
                ? 'ログイン'
                : 'Log in'}
          </button>
        </div>

        <p
          className={
            'tw-mb-0 tw-mt-4 tw-flex tw-flex-wrap tw-justify-center tw-gap-x-2 tw-gap-y-1 tw-text-center tw-text-[13px] tw-text-community-muted [&_button]:tw-border-0 [&_button]:tw-bg-transparent [&_button]:tw-p-0 [&_button]:tw-font-bold [&_button]:tw-text-community-accent-light [&_button]:tw-cursor-pointer hover:[&_button]:tw-underline'
          }
        >
          {registering
            ? ja
              ? 'すでにアカウントをお持ちですか？'
              : 'Already have an account?'
            : ja
              ? 'アカウントをお持ちでないですか？'
              : 'New to the community?'}
          <button type="button" onClick={() => setAuthMode(registering ? 'login' : 'register')}>
            {registering ? (ja ? 'ログイン' : 'Log in') : ja ? '新規登録' : 'Sign up'}
          </button>
        </p>
      </section>
    </form>
  );
}
