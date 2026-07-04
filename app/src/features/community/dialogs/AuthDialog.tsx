import { useState } from 'react';
import { Busy, ErrorMessage, Field } from '../components/FormUi';
import { Glyph } from '../components/Glyph';
import type { ModalLayerProps } from './types';

export function AuthDialog(props: ModalLayerProps & { mode: 'login' | 'register' }) {
  const { mode, ja, busy, error, close, setAuthMode, authenticate, defaultAuthorName } = props;
  const [showPassword, setShowPassword] = useState(false);
  const registering = mode === 'register';
  return (
    <form
      className="community-dialog community-auth"
      method="post"
      autoComplete="off"
      data-1p-ignore
      data-lpignore="true"
      data-bwignore="true"
      onSubmitCapture={(event) => event.preventDefault()}
      onSubmit={(event) => authenticate(event, mode)}
    >
      <button
        className="community-auth-close"
        type="button"
        onClick={close}
        aria-label={ja ? '閉じる' : 'Close'}
      >
        <Glyph name="close" />
      </button>
      <section className="community-auth-intro">
        <div className="community-auth-brand">
          <img src={browser.runtime.getURL('community/activity-icon.png' as never)} alt="" />
          <strong>{ja ? 'みんなの活動' : 'Campus Community'}</strong>
        </div>
        <div className="community-auth-intro-copy">
          <small>CAMPUS COMMUNITY</small>
          <h2>{ja ? 'キャンパスの日常を、もっと近くに。' : 'Campus life, closer together.'}</h2>
          <p>
            {ja
              ? '作品やイベント、クラブ活動。学生の「今」を見つけて、あなたの活動も共有できます。'
              : 'Discover student work, events and clubs—and share what you are doing.'}
          </p>
        </div>
        <p className="community-auth-view-note">
          {ja
            ? '投稿を見るだけならアカウントは必要ありません。'
            : 'No account is needed to browse posts.'}
        </p>
      </section>
      <section className="community-auth-panel">
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
        <div className="community-auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={registering}
            className={registering ? 'is-active' : ''}
            onClick={() => setAuthMode('register')}
          >
            {ja ? '新規登録' : 'Sign up'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!registering}
            className={!registering ? 'is-active' : ''}
            onClick={() => setAuthMode('login')}
          >
            {ja ? 'ログイン' : 'Log in'}
          </button>
        </div>
        <div className="community-auth-fields">
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
            <span className="community-password-field">
              <input
                className={showPassword ? '' : 'is-masked'}
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
                  className={showPassword ? '' : 'is-masked'}
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
              <aside className="community-auth-security-note">
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
        <button className="community-submit" style={{ marginTop: 20 }} disabled={busy}>
          {busy ? <Busy /> : null}
          {registering ? (ja ? 'アカウントを作成' : 'Create account') : ja ? 'ログイン' : 'Log in'}
        </button>
        <p className="community-auth-switch">
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
