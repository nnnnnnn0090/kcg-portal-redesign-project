import { useMemo, useRef, useState } from 'react';
import { ACADEMIC_GROUPS, activeTagPattern, SOCIAL_PLATFORMS } from '../constants';
import type { CommunityUser } from '../types';
import { Avatar } from '../components/Avatar';
import { Busy, DialogHeader, ErrorMessage, Field } from '../components/FormUi';
import { SocialIcon } from '../components/SocialIcon';
import type { ModalLayerProps } from './types';

export function ProfileDialog(props: ModalLayerProps & { user: CommunityUser }) {
  const {
    user,
    ja,
    busy,
    error,
    suggestedTags,
    avatarImage,
    headerImage,
    readAvatar,
    readHeader,
    saveProfile,
    close,
  } = props;
  const avatarInput = useRef<HTMLInputElement>(null);
  const headerInput = useRef<HTMLInputElement>(null);
  const profileTagsInput = useRef<HTMLInputElement>(null);
  const [academicGroup, setAcademicGroup] = useState(user.academicGroup ?? '');
  const [department, setDepartment] = useState(user.department ?? '');
  const [profileTagsValue, setProfileTagsValue] = useState(
    (user.pendingProfile?.profileTags ?? user.profileTags ?? []).map((tag) => `#${tag}`).join(' '),
  );
  const [profileTagSearch, setProfileTagSearch] = useState<string | null>(null);
  const [activeProfileTagIndex, setActiveProfileTagIndex] = useState(0);

  const matchingProfileTags = useMemo(() => {
    if (profileTagSearch === null) return [];
    const needle = profileTagSearch.toLocaleLowerCase();
    return suggestedTags
      .filter((tag) => !needle || tag.toLocaleLowerCase().includes(needle))
      .slice(0, 6);
  }, [profileTagSearch, suggestedTags]);

  const updateProfileTagSearch = (value: string, caret: number | null) => {
    const match = value.slice(0, caret ?? value.length).match(activeTagPattern);
    setActiveProfileTagIndex(0);
    setProfileTagSearch(match ? match[1] : null);
  };

  const insertProfileTag = (tag: string) => {
    const input = profileTagsInput.current;
    if (!input) return;
    const caret = input.selectionStart ?? profileTagsValue.length;
    const beforeCaret = profileTagsValue.slice(0, caret);
    const match = beforeCaret.match(activeTagPattern);
    if (!match) return;
    const hashIndex = caret - match[1].length - 1;
    const replacement = `#${tag} `;
    const next = profileTagsValue.slice(0, hashIndex) + replacement + profileTagsValue.slice(caret);
    const nextCaret = hashIndex + replacement.length;
    setProfileTagsValue(next);
    setProfileTagSearch(null);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const chooseImage = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.value = '';
    input.click();
  };

  return (
    <form
      className="community-dialog community-profile-dialog"
      method="post"
      onSubmitCapture={(event) => event.preventDefault()}
      onSubmit={saveProfile}
    >
      <DialogHeader title={ja ? 'プロフィールを編集' : 'Edit profile'} close={close} />
      <aside className="community-profile-review-note">
        <strong>
          {ja ? '変更は審査後に公開されます。' : 'Changes are published after review.'}
        </strong>
      </aside>
      <div className="community-profile-editor-media">
        <div className="community-profile-editor-section-head">
          <strong>{ja ? 'プロフィール画像' : 'Profile images'}</strong>
          <span>{ja ? 'アイコンは2MB、ヘッダー画像は5MBまで' : 'Avatar 2MB · Header 5MB'}</span>
        </div>
        <div className="community-profile-editor-header">
          {headerImage || user.headerUrl ? (
            <img src={headerImage || user.headerUrl || undefined} alt="" />
          ) : (
            <div className="community-profile-editor-header-empty" aria-hidden="true" />
          )}
          <button type="button" onClick={() => chooseImage(headerInput.current)}>
            {user.profileState === 'editing'
              ? ja
                ? 'ヘッダー画像を再選択'
                : 'Choose another header'
              : headerImage || user.headerUrl
                ? ja
                  ? 'ヘッダー画像を変更'
                  : 'Change header'
                : ja
                  ? 'ヘッダー画像を選択'
                  : 'Choose header'}
          </button>
        </div>
        <input
          className="community-profile-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={headerInput}
          onChange={(event) => {
            readHeader(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <div className="community-profile-editor-identity">
          <Avatar name={user.displayName} url={avatarImage || user.avatarUrl} large />
          <div>
            <strong>{user.pendingProfile?.displayName || user.displayName}</strong>
            <small>@{user.loginId}</small>
          </div>
          <button type="button" onClick={() => chooseImage(avatarInput.current)}>
            {user.profileState === 'editing'
              ? ja
                ? '画像を再選択'
                : 'Choose another image'
              : ja
                ? '画像を選択'
                : 'Choose image'}
          </button>
          <input
            className="community-profile-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={avatarInput}
            onChange={(event) => {
              readAvatar(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </div>
      </div>
      <div className="community-profile-editor-fields">
        <div className="community-profile-editor-section-head">
          <strong>{ja ? 'プロフィール情報' : 'Profile information'}</strong>
          <span>
            {ja ? '公開される情報を入力してください' : 'Information shown on your profile'}
          </span>
        </div>
        <div className="community-academic-editor">
          <div className="community-profile-editor-section-head">
            <strong>{ja ? '所属' : 'Academic program'}</strong>
            <span>
              {ja ? '学系・学科は審査なしで即時反映されます' : 'Saved immediately without review'}
            </span>
          </div>
          <div className="community-academic-selects">
            <Field label={ja ? '学系' : 'Academic group'}>
              <select
                name="academicGroup"
                value={academicGroup}
                onChange={(event) => {
                  setAcademicGroup(event.target.value);
                  setDepartment('');
                }}
              >
                <option value="">{ja ? '未設定' : 'Not set'}</option>
                {Object.keys(ACADEMIC_GROUPS).map((group) => (
                  <option value={group} key={group}>
                    {group}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={ja ? '学科' : 'Department'}>
              <select
                name="department"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                disabled={!academicGroup}
              >
                <option value="">{ja ? '未設定' : 'Not set'}</option>
                {(ACADEMIC_GROUPS[academicGroup] ?? []).map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <Field label={ja ? '表示名' : 'Display name'}>
          <input
            name="displayName"
            defaultValue={user.pendingProfile?.displayName || user.displayName}
            maxLength={40}
            required
          />
        </Field>
        <Field label={ja ? '自己紹介' : 'Bio'}>
          <textarea
            name="bio"
            defaultValue={user.pendingProfile?.bio ?? user.bio}
            maxLength={160}
            rows={4}
          />
        </Field>
        <Field label={ja ? 'プロフィールタグ' : 'Profile tags'}>
          <input
            ref={profileTagsInput}
            name="profileTags"
            value={profileTagsValue}
            onChange={(event) => {
              setProfileTagsValue(event.currentTarget.value);
              updateProfileTagSearch(event.currentTarget.value, event.currentTarget.selectionStart);
            }}
            onClick={(event) =>
              updateProfileTagSearch(event.currentTarget.value, event.currentTarget.selectionStart)
            }
            onBlur={() => setProfileTagSearch(null)}
            onKeyDown={(event) => {
              if (profileTagSearch === null || matchingProfileTags.length === 0) return;
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveProfileTagIndex((index) => (index + 1) % matchingProfileTags.length);
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveProfileTagIndex(
                  (index) => (index - 1 + matchingProfileTags.length) % matchingProfileTags.length,
                );
              } else if (event.key === 'Enter') {
                event.preventDefault();
                insertProfileTag(
                  matchingProfileTags[activeProfileTagIndex] ?? matchingProfileTags[0],
                );
              }
            }}
            onKeyUp={(event) => {
              if (event.key === 'Escape') setProfileTagSearch(null);
              else if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key))
                updateProfileTagSearch(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart,
                );
            }}
            maxLength={320}
            placeholder={ja ? '#ゲーム #デザイン #プログラミング' : '#game #design #programming'}
          />
        </Field>
        {profileTagSearch !== null ? (
          <div
            className="community-tag-suggestions is-profile-tags"
            role="listbox"
            aria-label={ja ? 'タグ候補' : 'Tag suggestions'}
          >
            <header>
              <span>{ja ? 'タグ候補' : 'Suggested tags'}</span>
              <small>{ja ? '選択してプロフィールタグに追加' : 'Select to insert'}</small>
            </header>
            {matchingProfileTags.length ? (
              matchingProfileTags.map((item, index) => (
                <button
                  className={index === activeProfileTagIndex ? 'is-active' : ''}
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={index === activeProfileTagIndex}
                  onMouseEnter={() => setActiveProfileTagIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertProfileTag(item)}
                >
                  <b>#</b>
                  <span>{item}</span>
                </button>
              ))
            ) : profileTagSearch ? (
              <div className="community-tag-new">
                <b>#{profileTagSearch}</b>
                <span>{ja ? '新しいタグとして申請できます' : 'This will be a new tag'}</span>
              </div>
            ) : (
              <div className="community-tag-new">
                <span>
                  {ja
                    ? '文字を続けて入力すると新しいタグを作れます'
                    : 'Keep typing to create a new tag'}
                </span>
              </div>
            )}
          </div>
        ) : null}
        <p className="community-help">
          {ja
            ? 'タグはプロフィール審査後に別枠で公開されます。最大10個まで。'
            : 'Tags are published separately after profile review. Up to 10 tags.'}
        </p>
        <Field label={ja ? 'URL' : 'Website'}>
          <input
            name="websiteUrl"
            type="url"
            inputMode="url"
            defaultValue={user.pendingProfile?.websiteUrl ?? user.websiteUrl ?? ''}
            maxLength={300}
            placeholder="https://example.com"
          />
        </Field>
        <div className="community-social-editor">
          <div className="community-profile-editor-section-head">
            <strong>{ja ? '外部リンク' : 'Social links'}</strong>
            <span>
              {ja ? '設定したものだけプロフィールに表示されます' : 'Only filled links are shown'}
            </span>
          </div>
          {SOCIAL_PLATFORMS.map((platform) => (
            <Field label={platform.label} key={platform.key}>
              <span className="community-social-input">
                <SocialIcon platform={platform.key} />
                <input
                  name={`social_${platform.key}`}
                  type="url"
                  inputMode="url"
                  defaultValue={
                    user.pendingProfile?.socialLinks?.[platform.key] ??
                    user.socialLinks?.[platform.key] ??
                    ''
                  }
                  maxLength={300}
                  placeholder={platform.placeholder}
                />
              </span>
            </Field>
          ))}
        </div>
      </div>
      <ErrorMessage text={error} />
      <footer>
        <button type="button" onClick={close}>
          {ja ? 'キャンセル' : 'Cancel'}
        </button>
        <button className="is-primary" disabled={busy}>
          {busy ? <Busy /> : null}
          {ja ? '審査へ送信' : 'Submit for review'}
        </button>
      </footer>
    </form>
  );
}
