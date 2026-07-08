import { useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ACADEMIC_GROUPS,
  activeTagPattern,
  advanceTagSuggestionIndex,
  COMMUNITY_INPUT_LIMITS,
  COMMUNITY_TAG_NEW_CLASS,
  COMMUNITY_TAG_SUGGESTIONS_SURFACE_CLASS,
  SOCIAL_PLATFORMS,
} from '../constants';
import type { CommunityUser } from '../types';
import { Avatar } from '../components/Avatar';
import { BareField, Busy, CharacterCount, DialogHeader, ErrorMessage, Field } from '../components/FormUi';
import { SocialIcon } from '../components/SocialIcon';
import { TagHighlightField } from '../components/TagHighlightField';
import type { ModalLayerProps } from './types';
import { cn } from '../../../lib/cn';
import { dataTransferHasFiles } from '../imageFiles';
import { SOCIAL_PLATFORM_FORMATS, socialUrlToId } from '../socialLinks';
import { COMMUNITY_DIALOG_SURFACE_CLASS } from './dialogStyles';

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
  const [displayName, setDisplayName] = useState(
    user.pendingProfile?.displayName || user.displayName,
  );
  const [bio, setBio] = useState(user.pendingProfile?.bio ?? user.bio);
  const [websiteUrl, setWebsiteUrl] = useState(
    user.pendingProfile?.websiteUrl ?? user.websiteUrl ?? '',
  );
  const [profileTagsValue, setProfileTagsValue] = useState(
    (user.pendingProfile?.profileTags ?? user.profileTags ?? []).map((tag) => `#${tag}`).join(' '),
  );
  const [socialIds, setSocialIds] = useState(() =>
    Object.fromEntries(
      SOCIAL_PLATFORMS.map((platform) => [
        platform.key,
        socialUrlToId(
          platform.key,
          user.pendingProfile?.socialLinks?.[platform.key] ?? user.socialLinks?.[platform.key],
        ),
      ]),
    ),
  );
  const [profileTagSearch, setProfileTagSearch] = useState<string | null>(null);
  const [activeProfileTagIndex, setActiveProfileTagIndex] = useState(-1);
  const [headerDropActive, setHeaderDropActive] = useState(false);
  const [avatarDropActive, setAvatarDropActive] = useState(false);
  const headerDropDepth = useRef(0);
  const avatarDropDepth = useRef(0);

  const matchingProfileTags = useMemo(() => {
    if (profileTagSearch === null) return [];
    const needle = profileTagSearch.toLocaleLowerCase();
    return suggestedTags
      .filter((tag) => !needle || tag.toLocaleLowerCase().includes(needle))
      .slice(0, 6);
  }, [profileTagSearch, suggestedTags]);

  const updateProfileTagSearch = (value: string, caret: number | null) => {
    const match = value.slice(0, caret ?? value.length).match(activeTagPattern);
    setActiveProfileTagIndex(-1);
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

  const handleProfileImageDragEnter = (
    event: DragEvent<HTMLElement>,
    kind: 'header' | 'avatar',
  ) => {
    if (!dataTransferHasFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    const depth = kind === 'header' ? headerDropDepth : avatarDropDepth;
    depth.current += 1;
    if (kind === 'header') setHeaderDropActive(true);
    else setAvatarDropActive(true);
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleProfileImageDragOver = (event: DragEvent<HTMLElement>) => {
    if (!dataTransferHasFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleProfileImageDragLeave = (
    event: DragEvent<HTMLElement>,
    kind: 'header' | 'avatar',
  ) => {
    if (!dataTransferHasFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    const depth = kind === 'header' ? headerDropDepth : avatarDropDepth;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current !== 0) return;
    if (kind === 'header') setHeaderDropActive(false);
    else setAvatarDropActive(false);
  };

  const handleProfileImageDrop = (event: DragEvent<HTMLElement>, kind: 'header' | 'avatar') => {
    if (!dataTransferHasFiles(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    headerDropDepth.current = 0;
    avatarDropDepth.current = 0;
    setHeaderDropActive(false);
    setAvatarDropActive(false);
    const file = Array.from(event.dataTransfer.files)[0];
    if (!file) return;
    if (kind === 'header') readHeader(file);
    else readAvatar(file);
  };

  return (
    <div
      role="form"
      className={`${COMMUNITY_DIALOG_SURFACE_CLASS} community-profile-dialog tw-w-full tw-max-w-[780px]`}
    >
      <DialogHeader title={ja ? 'プロフィールを編集' : 'Edit profile'} close={close} />
      <aside
        className={
          'community-profile-review-note tw-mx-6 tw-mt-5 tw-rounded-lg tw-bg-community-accent-bg tw-p-3 tw-text-[13px] tw-text-community-accent-light max-[620px]:tw-mx-4'
        }
      >
        <strong>
          {ja ? '変更は審査後に公開されます。' : 'Changes are published after review.'}
        </strong>
      </aside>
      <div className={'community-profile-editor-media tw-grid tw-gap-4 tw-p-6 max-[620px]:tw-px-4'}>
        <div
          className={
            'community-profile-editor-section-head tw-flex tw-items-start tw-justify-between tw-gap-3 [&_strong]:tw-text-sm [&_strong]:tw-text-community-bright [&_span]:tw-text-xs [&_span]:tw-text-community-muted'
          }
        >
          <strong>{ja ? 'プロフィール画像' : 'Profile images'}</strong>
          <span>{ja ? 'アイコンは2MB、ヘッダー画像は5MBまで' : 'Avatar 2MB · Header 5MB'}</span>
        </div>
        <div
          className={cn(
            'community-profile-editor-header tw-relative tw-h-[180px] tw-overflow-hidden tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg3 tw-transition [&.is-file-dragging]:tw-border-community-accent [&.is-file-dragging]:tw-ring-2 [&.is-file-dragging]:tw-ring-community-accent-bg [&>img]:tw-h-full [&>img]:tw-w-full [&>img]:tw-object-contain [&>.community-profile-editor-header-empty]:tw-h-full [&>.community-profile-editor-header-empty]:tw-w-full [&>button]:tw-absolute [&>button]:tw-bottom-3 [&>button]:tw-right-3 [&>button]:tw-min-h-9 [&>button]:tw-rounded-lg [&>button]:tw-border [&>button]:tw-border-community-border [&>button]:tw-bg-community-bg2 [&>button]:tw-px-3 [&>button]:tw-font-bold [&>button]:tw-text-community-text [&>button]:tw-cursor-pointer [&>button]:tw-transition-[transform,border-color,background-color,box-shadow,color] [&>button]:tw-duration-180 hover:[&>button]:tw-translate-y-[-2px] hover:[&>button]:tw-border-community-accent hover:[&>button]:tw-bg-community-accent-bg hover:[&>button]:tw-text-community-accent-light hover:[&>button]:tw-shadow-community-card active:[&>button]:tw-translate-y-0 active:[&>button]:tw-scale-[.98]',
            headerDropActive && 'is-file-dragging',
          )}
          onDragEnter={(event) => handleProfileImageDragEnter(event, 'header')}
          onDragOver={handleProfileImageDragOver}
          onDragLeave={(event) => handleProfileImageDragLeave(event, 'header')}
          onDrop={(event) => handleProfileImageDrop(event, 'header')}
        >
          {headerImage || user.headerUrl ? (
            <img src={headerImage || user.headerUrl || undefined} alt="" />
          ) : (
            <div
              className={
                'community-profile-editor-header-empty tw-bg-gradient-to-br tw-from-community-accent-bg tw-to-community-bg3'
              }
              aria-hidden="true"
            />
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
          className={'community-profile-file-input tw-sr-only'}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={headerInput}
          onChange={(event) => {
            readHeader(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <div
          className={cn(
            'community-profile-editor-identity tw-grid tw-grid-cols-[auto_minmax(0,1fr)_auto] tw-items-center tw-gap-3 tw-rounded-xl tw-transition max-[620px]:tw-grid-cols-[auto_minmax(0,1fr)] [&.is-file-dragging]:tw-bg-community-accent-bg [&.is-file-dragging]:tw-ring-2 [&.is-file-dragging]:tw-ring-community-accent-bg [&>div]:tw-grid [&>div]:tw-min-w-0 [&_strong]:tw-text-community-bright [&_small]:tw-text-community-muted [&>button]:tw-min-h-9 [&>button]:tw-rounded-lg [&>button]:tw-border [&>button]:tw-border-community-border [&>button]:tw-bg-community-bg3 [&>button]:tw-px-3 [&>button]:tw-text-community-text [&>button]:tw-cursor-pointer [&>button]:tw-transition-[transform,border-color,background-color,box-shadow,color] [&>button]:tw-duration-180 hover:[&>button]:tw-translate-y-[-2px] hover:[&>button]:tw-border-community-accent hover:[&>button]:tw-bg-community-accent-bg hover:[&>button]:tw-text-community-accent-light hover:[&>button]:tw-shadow-community-card active:[&>button]:tw-translate-y-0 active:[&>button]:tw-scale-[.98] max-[620px]:[&>button]:tw-col-span-full max-[620px]:[&>button]:tw-w-full',
            avatarDropActive && 'is-file-dragging',
          )}
          onDragEnter={(event) => handleProfileImageDragEnter(event, 'avatar')}
          onDragOver={handleProfileImageDragOver}
          onDragLeave={(event) => handleProfileImageDragLeave(event, 'avatar')}
          onDrop={(event) => handleProfileImageDrop(event, 'avatar')}
        >
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
            className={'community-profile-file-input tw-sr-only'}
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
      <div
        className={
          'community-profile-editor-fields tw-grid tw-gap-4 tw-border-t tw-border-community-border-light tw-p-6 max-[620px]:tw-px-4'
        }
      >
        <div
          className={
            'community-profile-editor-section-head tw-flex tw-items-start tw-justify-between tw-gap-3 [&_strong]:tw-text-sm [&_strong]:tw-text-community-bright [&_span]:tw-text-xs [&_span]:tw-text-community-muted'
          }
        >
          <strong>{ja ? 'プロフィール情報' : 'Profile information'}</strong>
          <span>
            {ja ? '公開される情報を入力してください' : 'Information shown on your profile'}
          </span>
        </div>
        <div
          className={
            'community-academic-editor tw-grid tw-gap-3 tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg2 tw-p-4'
          }
        >
          <div
            className={
              'community-profile-editor-section-head tw-flex tw-items-start tw-justify-between tw-gap-3 [&_strong]:tw-text-sm [&_strong]:tw-text-community-bright [&_span]:tw-text-xs [&_span]:tw-text-community-muted'
            }
          >
            <strong>{ja ? '所属' : 'Academic program'}</strong>
            <span>
              {ja ? '学系・学科は審査なしで即時反映されます' : 'Saved immediately without review'}
            </span>
          </div>
          <div
            className={
              'community-academic-selects tw-grid tw-grid-cols-2 tw-gap-3 max-[620px]:tw-grid-cols-1'
            }
          >
            <Field label={ja ? '学系' : 'Academic group'}>
              <select
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
        <Field
          label={ja ? '表示名' : 'Display name'}
          meta={<CharacterCount value={displayName} max={COMMUNITY_INPUT_LIMITS.displayName} />}
        >
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.currentTarget.value)}
            maxLength={COMMUNITY_INPUT_LIMITS.displayName}
          />
        </Field>
        <Field
          label={ja ? '自己紹介' : 'Bio'}
          meta={<CharacterCount value={bio} max={COMMUNITY_INPUT_LIMITS.bio} />}
        >
          <textarea
            value={bio}
            onChange={(event) => setBio(event.currentTarget.value)}
            maxLength={COMMUNITY_INPUT_LIMITS.bio}
            rows={4}
          />
        </Field>
        <BareField
          label={ja ? 'プロフィールタグ' : 'Profile tags'}
          meta={
            <CharacterCount value={profileTagsValue} max={COMMUNITY_INPUT_LIMITS.profileTagsText} />
          }
        >
          <TagHighlightField
            ref={profileTagsInput}
            value={profileTagsValue}
            spellCheck={false}
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
                setActiveProfileTagIndex((index) =>
                  advanceTagSuggestionIndex(index, matchingProfileTags.length, 1),
                );
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveProfileTagIndex((index) =>
                  advanceTagSuggestionIndex(index, matchingProfileTags.length, -1),
                );
              } else if (event.key === 'Tab') {
                event.preventDefault();
                setActiveProfileTagIndex((index) =>
                  advanceTagSuggestionIndex(
                    index,
                    matchingProfileTags.length,
                    event.shiftKey ? -1 : 1,
                  ),
                );
              } else if (event.key === 'Enter') {
                event.preventDefault();
                insertProfileTag(
                  matchingProfileTags[activeProfileTagIndex >= 0 ? activeProfileTagIndex : 0] ??
                    matchingProfileTags[0],
                );
              }
            }}
            onKeyUp={(event) => {
              if (event.key === 'Escape') setProfileTagSearch(null);
              else if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key))
                updateProfileTagSearch(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart,
                );
            }}
            maxLength={COMMUNITY_INPUT_LIMITS.profileTagsText}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            placeholder={ja ? '#ゲーム #デザイン #プログラミング' : '#game #design #programming'}
          />
        {profileTagSearch !== null ? (
          <div
            className={cn(COMMUNITY_TAG_SUGGESTIONS_SURFACE_CLASS, 'is-profile-tags')}
            role="listbox"
            aria-label={ja ? 'タグ候補' : 'Tag suggestions'}
          >
            <header>
              <span>{ja ? 'タグ候補' : 'Suggested tags'}</span>
              <small>{ja ? 'Tab で移動 / Enter で追加' : 'Tab to move / Enter to insert'}</small>
            </header>
            {matchingProfileTags.length ? (
              matchingProfileTags.map((item, index) => (
                <button
                  className={cn(index === activeProfileTagIndex && 'is-active')}
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
              <div className={COMMUNITY_TAG_NEW_CLASS}>
                <b>#{profileTagSearch}</b>
                <span>{ja ? '新しいタグとして申請できます' : 'This will be a new tag'}</span>
              </div>
            ) : (
              <div className={COMMUNITY_TAG_NEW_CLASS}>
                <span>
                  {ja
                    ? '文字を続けて入力すると新しいタグを作れます'
                    : 'Keep typing to create a new tag'}
                </span>
              </div>
            )}
          </div>
        ) : null}
        <p className={'community-help tw-m-0 tw-text-[13px] tw-text-community-muted'}>
          {ja
            ? 'タグはプロフィール審査後に別枠で公開されます。最大5個まで。'
            : 'Tags are published separately after profile review. Up to 5 tags.'}
        </p>
        </BareField>
        <Field
          label={ja ? 'URL' : 'Website'}
          meta={<CharacterCount value={websiteUrl} max={COMMUNITY_INPUT_LIMITS.websiteUrl} />}
        >
          <input
            type="url"
            inputMode="url"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.currentTarget.value)}
            maxLength={COMMUNITY_INPUT_LIMITS.websiteUrl}
            placeholder="https://example.com"
          />
        </Field>
        <div
          className={
            'community-social-editor tw-grid tw-grid-cols-2 tw-gap-3 max-[620px]:tw-grid-cols-1 [&>.community-profile-editor-section-head]:tw-col-span-full'
          }
        >
          <div
            className={
              'community-profile-editor-section-head tw-flex tw-items-start tw-justify-between tw-gap-3 [&_strong]:tw-text-sm [&_strong]:tw-text-community-bright [&_span]:tw-text-xs [&_span]:tw-text-community-muted'
            }
          >
            <strong>{ja ? '外部リンク' : 'Social links'}</strong>
            <span>
              {ja ? '設定したものだけプロフィールに表示されます' : 'Only filled links are shown'}
            </span>
          </div>
          {SOCIAL_PLATFORMS.map((platform) => (
            <Field
              label={platform.label}
              key={platform.key}
              meta={
                <CharacterCount
                  value={socialIds[platform.key] ?? ''}
                  max={SOCIAL_PLATFORM_FORMATS[platform.key].maxLength}
                />
              }
            >
              <span
                className={
                  'community-social-input tw-flex tw-items-center tw-gap-2 [&_input]:tw-min-w-0 [&_input]:tw-flex-1'
                }
              >
                <SocialIcon platform={platform.key} />
                <span
                  className={
                    'community-social-url-field tw-flex tw-min-w-0 tw-flex-1 tw-overflow-hidden tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg2 focus-within:tw-border-community-accent focus-within:tw-ring-2 focus-within:tw-ring-community-accent-bg [&_input]:tw-border-0 [&_input]:tw-bg-transparent [&_input]:tw-ring-0 [&>span]:tw-flex [&>span]:tw-items-center [&>span]:tw-bg-community-bg3 [&>span]:tw-px-2.5 [&>span]:tw-text-xs [&>span]:tw-text-community-muted'
                  }
                >
                  <span>{SOCIAL_PLATFORM_FORMATS[platform.key].prefix}</span>
                  <input
                    type="text"
                    inputMode={SOCIAL_PLATFORM_FORMATS[platform.key].inputMode ?? 'text'}
                    value={socialIds[platform.key] ?? ''}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setSocialIds((current) => ({
                        ...current,
                        [platform.key]: value,
                      }));
                    }}
                    maxLength={SOCIAL_PLATFORM_FORMATS[platform.key].maxLength}
                    placeholder={platform.placeholder}
                  />
                  {SOCIAL_PLATFORM_FORMATS[platform.key].suffix ? (
                    <span>{SOCIAL_PLATFORM_FORMATS[platform.key].suffix}</span>
                  ) : null}
                </span>
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
        <button
          type="button"
          className={
            'is-primary tw-border-community-accent tw-bg-community-accent tw-text-community-on-accent hover:tw-translate-y-[-1px] hover:tw-brightness-110 hover:tw-shadow-community-card'
          }
          disabled={busy}
          onClick={() =>
            void saveProfile({
              academicGroup,
              department,
              displayName,
              bio,
              websiteUrl,
              profileTags: profileTagsValue,
              socialLinks: Object.fromEntries(
                SOCIAL_PLATFORMS.map((platform) => [
                  platform.key,
                  socialIds[platform.key] ?? '',
                ]),
              ),
            })
          }
        >
          {busy ? <Busy /> : null}
          {ja ? '審査へ送信' : 'Submit for review'}
        </button>
      </footer>
    </div>
  );
}
