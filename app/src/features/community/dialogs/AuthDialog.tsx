import { useState } from 'react';
import { Busy, ErrorMessage, Field } from '../components/FormUi';
import { Glyph } from '../components/Glyph';
import type { ModalLayerProps } from './types';
import { cn } from '../classNames';

export function AuthDialog(props: ModalLayerProps & { mode: 'login' | 'register' }) {
  const { mode, ja, busy, error, close, setAuthMode, authenticate, defaultAuthorName } = props;
  const [showPassword, setShowPassword] = useState(false);
  const registering = mode === 'register';
  return (
    <form
      className={
        'community-dialog tw-max-h-[min(90vh,900px)] tw-w-full tw-max-w-[620px] tw-overflow-auto tw-rounded-[18px] tw-border tw-border-[var(--p-border-hover)] tw-bg-community-bg tw-shadow-community-modal tw-animate-community-dialog-in max-[620px]:tw-max-h-[calc(100vh-24px)] max-[620px]:tw-rounded-2xl [&>footer]:tw-flex [&>footer]:tw-justify-end [&>footer]:tw-gap-2 [&>footer]:tw-border-t [&>footer]:tw-border-community-border [&>footer]:tw-bg-community-bg2 [&>footer]:tw-p-4 [&>footer>button]:tw-inline-flex [&>footer>button]:tw-min-h-10 [&>footer>button]:tw-appearance-none [&>footer>button]:tw-items-center [&>footer>button]:tw-justify-center [&>footer>button]:tw-gap-2 [&>footer>button]:tw-rounded-lg [&>footer>button]:tw-border [&>footer>button]:tw-border-community-border [&>footer>button]:tw-bg-community-bg3 [&>footer>button]:tw-px-4 [&>footer>button]:tw-text-sm [&>footer>button]:tw-font-bold [&>footer>button]:tw-text-community-text [&>footer>button]:tw-cursor-pointer [&>footer>button.is-primary]:tw-border-community-accent [&>footer>button.is-primary]:tw-bg-community-accent [&>footer>button.is-primary]:tw-text-community-bg [&_button:disabled]:tw-cursor-not-allowed [&_button:disabled]:tw-opacity-[.55] community-auth tw-relative tw-grid tw-w-full tw-max-w-[860px] tw-grid-cols-[minmax(260px,.85fr)_minmax(340px,1fr)] tw-overflow-hidden max-[760px]:tw-grid-cols-1'
      }
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
          'community-auth-close tw-absolute tw-right-4 tw-top-4 tw-z-[5] tw-grid tw-h-10 tw-w-10 tw-place-items-center tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg3 tw-p-0 tw-cursor-pointer [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-current'
        }
        type="button"
        onClick={close}
        aria-label={ja ? '閉じる' : 'Close'}
      >
        <Glyph name="close" />
      </button>
      <section
        className={
          'community-auth-intro tw-relative tw-flex tw-flex-col tw-gap-8 tw-bg-gradient-to-br tw-from-community-accent-bg tw-to-community-bg3 tw-p-8 max-[760px]:tw-hidden'
        }
      >
        <div
          className={
            'community-auth-brand tw-flex tw-items-center tw-gap-3 [&_img]:tw-h-11 [&_img]:tw-w-11 [&_img]:tw-object-contain [&_strong]:tw-text-base [&_strong]:tw-text-community-bright'
          }
        >
          <img src={browser.runtime.getURL('community/activity-icon.png' as never)} alt="" />
          <strong>{ja ? 'みんなの活動' : 'Campus Community'}</strong>
        </div>
        <div
          className={
            'community-auth-intro-copy [&_h2]:tw-mb-3 [&_h2]:tw-mt-0 [&_h2]:tw-text-[26px] [&_h2]:tw-leading-snug [&_h2]:tw-text-community-bright [&_p]:tw-m-0 [&_p]:tw-text-sm [&_p]:tw-text-community-muted'
          }
        >
          <small>CAMPUS COMMUNITY</small>
          <h2>{ja ? 'キャンパスの日常を、もっと近くに。' : 'Campus life, closer together.'}</h2>
          <p>
            {ja
              ? '作品やイベント、クラブ活動。学生の「今」を見つけて、あなたの活動も共有できます。'
              : 'Discover student work, events and clubs—and share what you are doing.'}
          </p>
        </div>
        <p className={'community-auth-view-note tw-m-0 tw-text-[13px] tw-text-community-muted'}>
          {ja
            ? '投稿を見るだけならアカウントは必要ありません。'
            : 'No account is needed to browse posts.'}
        </p>
      </section>
      <section
        className={
          'community-auth-panel tw-relative tw-bg-community-bg tw-p-8 max-[620px]:tw-px-4 max-[620px]:tw-py-6 [&>header>small]:tw-text-xs [&>header>small]:tw-font-bold [&>header>small]:tw-tracking-[.06em] [&>header>small]:tw-text-community-accent-light [&>header>h2]:tw-m-0 [&>header>h2]:tw-text-2xl [&>header>h2]:tw-text-community-bright [&>header>p]:tw-mb-6 [&>header>p]:tw-mt-2 [&>header>p]:tw-text-sm [&>header>p]:tw-text-community-muted'
        }
      >
        <header>
          <small>
            {registering
              ? ja
                ? 'はじめての方'
                : 'New here'
              : ja
                ? 'おかえりなさい'
                : 'Welcome back'}
          </small>
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
            'community-auth-tabs tw-mb-6 tw-mt-11 tw-grid tw-grid-cols-2 tw-gap-1 tw-rounded-[10px] tw-bg-community-bg3 tw-p-1 [&_button]:tw-min-h-10 [&_button]:tw-rounded-lg [&_button]:tw-border-0 [&_button]:tw-bg-transparent [&_button]:tw-font-bold [&_button]:tw-text-community-muted [&_button]:tw-cursor-pointer [&_button.is-active]:tw-bg-community-bg2 [&_button.is-active]:tw-text-community-bright [&_button.is-active]:tw-shadow'
          }
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={registering}
            className={cn(registering && 'is-active')}
            onClick={() => setAuthMode('register')}
          >
            {ja ? '新規登録' : 'Sign up'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!registering}
            className={cn(!registering && 'is-active')}
            onClick={() => setAuthMode('login')}
          >
            {ja ? 'ログイン' : 'Log in'}
          </button>
        </div>
        <div className={'community-auth-fields tw-mb-5 tw-grid tw-gap-4'}>
          {registering ? (
            <Field label={ja ? '表示名' : 'Display name'}>
              <input
                name="displayName"
                defaultValue={defaultAuthorName}
                maxLength={40}
                autoComplete="name"
                data-1p-ignore
                data-lpignore="true"
                placeholder={ja ? 'みんなに表示する名前' : 'Name shown to others'}
                required
              />
            </Field>
          ) : null}
          <Field label={ja ? 'ユーザーID' : 'User ID'}>
            <input
              name="communityLoginId"
              minLength={4}
              maxLength={32}
              pattern="[A-Za-z0-9_.-]+"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore="true"
              placeholder={ja ? '半角英数字・記号で4文字以上' : '4 or more characters'}
              autoFocus
              required
            />
          </Field>
          <Field label={ja ? 'パスワード' : 'Password'}>
            <span
              className={
                'community-password-field tw-relative [&_input]:tw-pr-[52px] [&_button]:tw-absolute [&_button]:tw-bottom-1 [&_button]:tw-right-1 [&_button]:tw-h-8 [&_button]:tw-rounded-md [&_button]:tw-border-0 [&_button]:tw-bg-community-bg3 [&_button]:tw-px-2 [&_button]:tw-text-xs [&_button]:tw-text-community-muted'
              }
            >
              <input
                className={cn(
                  !showPassword && 'is-masked [text-security:disc] [-webkit-text-security:disc]',
                )}
                name="communitySecret"
                type="text"
                minLength={8}
                maxLength={128}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-bwignore="true"
                placeholder={ja ? '8文字以上' : '8 or more characters'}
                required
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? (ja ? '隠す' : 'Hide') : ja ? '表示' : 'Show'}
              </button>
            </span>
          </Field>
          {registering ? (
            <>
              <Field label={ja ? 'パスワード（確認）' : 'Confirm password'}>
                <input
                  className={cn(
                    !showPassword && 'is-masked [text-security:disc] [-webkit-text-security:disc]',
                  )}
                  name="communitySecretConfirmation"
                  type="text"
                  minLength={8}
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
              <aside
                className={
                  'community-auth-security-note tw-my-4 tw-rounded-lg tw-bg-community-accent-bg tw-p-3 tw-text-[13px] [&_strong]:tw-mb-1 [&_strong]:tw-block [&_strong]:tw-text-community-bright [&_span]:tw-block'
                }
              >
                <strong>
                  {ja ? '学校の認証情報は使用しないでください' : 'Do not use school credentials'}
                </strong>
                <span>
                  {ja
                    ? 'このアカウントは学校のアカウントとは無関係です。学校のIDやパスワードと同じものは絶対に設定しないでください。'
                    : 'This account is separate from your school account. Never reuse your school ID or password.'}
                </span>
              </aside>
            </>
          ) : null}
        </div>
        <ErrorMessage text={error} />
        <button
          className={
            'community-submit tw-mt-5 tw-inline-flex tw-min-h-10 tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border tw-border-community-accent tw-bg-community-accent tw-px-4 tw-font-bold tw-text-community-bg tw-cursor-pointer'
          }
          disabled={busy}
        >
          {busy ? <Busy /> : null}
          {registering ? (ja ? 'アカウントを作成' : 'Create account') : ja ? 'ログイン' : 'Log in'}
        </button>
        <p
          className={
            'community-auth-switch tw-mb-0 tw-mt-4 tw-flex tw-justify-center tw-gap-2 tw-text-[13px] tw-text-community-muted [&_button]:tw-border-0 [&_button]:tw-bg-transparent [&_button]:tw-p-0 [&_button]:tw-font-bold [&_button]:tw-text-community-accent-light [&_button]:tw-cursor-pointer'
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
