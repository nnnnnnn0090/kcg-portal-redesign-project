import { useState, type FormEvent } from 'react';
import { COMMUNITY_INPUT_LIMITS } from '../constants';
import { CharacterCount, ErrorMessage, Field } from '../components/FormUi';

const submitButtonClass =
  'tw-inline-flex tw-min-h-10 tw-items-center tw-justify-center tw-rounded-lg tw-border-0 tw-bg-community-accent tw-px-4 tw-font-bold tw-text-community-on-accent tw-cursor-pointer disabled:tw-cursor-not-allowed disabled:tw-opacity-50';

type ContactCategory = 'bug' | 'feature' | 'account' | 'community' | 'other';

export function FeedbackScreen({
  ja,
  busy,
  error,
  onSubmitSuggestion,
  onSubmitContact,
}: {
  ja: boolean;
  busy: boolean;
  error: string;
  onSubmitSuggestion: (message: string) => Promise<void>;
  onSubmitContact: (values: {
    category: ContactCategory;
    subject: string;
    message: string;
  }) => Promise<void>;
}) {
  const [suggestion, setSuggestion] = useState('');
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [category, setCategory] = useState<ContactCategory>('community');
  const [subject, setSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  const submitSuggestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !suggestion.trim()) return;
    try {
      await onSubmitSuggestion(suggestion.trim());
      setSuggestion('');
      setSuggestionSent(true);
    } catch {
      // error state is shown via props
    }
  };

  const submitContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !subject.trim() || !contactMessage.trim()) return;
    try {
      await onSubmitContact({
        category,
        subject: subject.trim(),
        message: contactMessage.trim(),
      });
      setSubject('');
      setContactMessage('');
      setContactSent(true);
    } catch {
      // error state is shown via props
    }
  };

  return (
    <main
      className={
        'community-scroll tw-min-h-0 tw-min-w-0 tw-overflow-auto [scrollbar-gutter:stable]'
      }
    >
      <div
        className={
          'community-content tw-mx-auto tw-w-full tw-max-w-[760px] tw-px-6 tw-pb-14 tw-pt-6 max-[960px]:tw-px-4 max-[620px]:tw-px-3 max-[620px]:tw-pb-12'
        }
      >
        <header
          className={
            'community-screen-heading tw-mb-5 [&_h1]:tw-m-0 [&_h1]:tw-text-[clamp(22px,2.5vw,28px)] [&_h1]:tw-font-bold [&_h1]:tw-text-community-bright [&_p]:tw-mb-0 [&_p]:tw-mt-2 [&_p]:tw-text-sm [&_p]:tw-text-community-muted'
          }
        >
          <h1>{ja ? 'お問い合わせ・意見箱' : 'Contact and suggestions'}</h1>
          <p>
            {ja
              ? 'コミュニティへのご意見や、不具合・お問い合わせをお送りください。'
              : 'Send feedback about the community or contact us about issues.'}
          </p>
        </header>

        <div className="tw-grid tw-gap-8">
          <section
            className={
              'tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg2 tw-p-5 tw-shadow-community-card'
            }
          >
            <h2 className="tw-m-0 tw-mb-1 tw-text-lg tw-font-bold tw-text-community-bright">
              {ja ? '意見箱' : 'Suggestion box'}
            </h2>
            <p className="tw-m-0 tw-mb-4 tw-text-sm tw-text-community-muted">
              {ja
                ? 'みんなの活動の使い勝手やほしい機能など、自由にどうぞ。'
                : 'Share ideas to improve the community experience.'}
            </p>
            {suggestionSent ? (
              <p className="tw-m-0 tw-rounded-lg tw-bg-community-accent-bg tw-p-3 tw-text-sm tw-text-community-accent-light">
                {ja ? 'ご意見を受け付けました。ありがとうございます。' : 'Thanks for your feedback.'}
              </p>
            ) : (
              <form className="tw-grid tw-gap-4" onSubmit={(event) => void submitSuggestion(event)}>
                <Field
                  label={ja ? 'ご意見' : 'Your message'}
                  meta={
                    <CharacterCount
                      value={suggestion}
                      max={COMMUNITY_INPUT_LIMITS.suggestionMessage}
                    />
                  }
                >
                  <textarea
                    name="message"
                    value={suggestion}
                    maxLength={COMMUNITY_INPUT_LIMITS.suggestionMessage}
                    placeholder={
                      ja ? '例: タグ検索をもっと見やすくしてほしい' : 'e.g. Improve tag search UX'
                    }
                    onChange={(event) => setSuggestion(event.target.value)}
                  />
                </Field>
                <ErrorMessage text={error} />
                <button className={submitButtonClass} type="submit" disabled={busy || !suggestion.trim()}>
                  {ja ? '意見を送る' : 'Send suggestion'}
                </button>
              </form>
            )}
          </section>

          <section
            className={
              'tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg2 tw-p-5 tw-shadow-community-card'
            }
          >
            <h2 className="tw-m-0 tw-mb-1 tw-text-lg tw-font-bold tw-text-community-bright">
              {ja ? 'お問い合わせ' : 'Contact'}
            </h2>
            <p className="tw-m-0 tw-mb-4 tw-text-sm tw-text-community-muted">
              {ja
                ? '不具合報告やアカウントに関するお問い合わせはこちらから。'
                : 'Report bugs or ask about your account.'}
            </p>
            {contactSent ? (
              <p className="tw-m-0 tw-rounded-lg tw-bg-community-accent-bg tw-p-3 tw-text-sm tw-text-community-accent-light">
                {ja
                  ? 'お問い合わせを受け付けました。内容を確認します。'
                  : 'Your inquiry was received. We will review it.'}
              </p>
            ) : (
              <form className="tw-grid tw-gap-4" onSubmit={(event) => void submitContact(event)}>
                <Field label={ja ? '種別' : 'Category'}>
                  <select
                    name="category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ContactCategory)}
                  >
                    <option value="bug">{ja ? '不具合' : 'Bug'}</option>
                    <option value="feature">{ja ? '機能要望' : 'Feature request'}</option>
                    <option value="account">{ja ? 'アカウント' : 'Account'}</option>
                    <option value="community">{ja ? 'コミュニティ' : 'Community'}</option>
                    <option value="other">{ja ? 'その他' : 'Other'}</option>
                  </select>
                </Field>
                <Field
                  label={ja ? '件名' : 'Subject'}
                  meta={
                    <CharacterCount value={subject} max={COMMUNITY_INPUT_LIMITS.contactSubject} />
                  }
                >
                  <input
                    name="subject"
                    value={subject}
                    maxLength={COMMUNITY_INPUT_LIMITS.contactSubject}
                    placeholder={ja ? '例: 投稿画像が表示されない' : 'e.g. Images do not load'}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </Field>
                <Field
                  label={ja ? '内容' : 'Message'}
                  meta={
                    <CharacterCount
                      value={contactMessage}
                      max={COMMUNITY_INPUT_LIMITS.contactMessage}
                    />
                  }
                >
                  <textarea
                    name="message"
                    value={contactMessage}
                    maxLength={COMMUNITY_INPUT_LIMITS.contactMessage}
                    placeholder={
                      ja
                        ? '状況や再現手順など、わかる範囲で詳しく書いてください。'
                        : 'Describe the issue and steps to reproduce.'
                    }
                    onChange={(event) => setContactMessage(event.target.value)}
                  />
                </Field>
                <ErrorMessage text={error} />
                <button
                  className={submitButtonClass}
                  type="submit"
                  disabled={busy || !subject.trim() || !contactMessage.trim()}
                >
                  {ja ? 'お問い合わせを送る' : 'Send inquiry'}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
