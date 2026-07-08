import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { activeTagPattern, advanceTagSuggestionIndex, COMMUNITY_INPUT_LIMITS, COMMUNITY_TAG_NEW_CLASS, COMMUNITY_TAG_SUGGESTIONS_SURFACE_CLASS } from '../constants';
import type { CommunityUser } from '../types';
import { Avatar } from '../components/Avatar';
import { BareField, Busy, CharacterCount, DialogHeader, ErrorMessage, Field } from '../components/FormUi';
import { Glyph } from '../components/Glyph';
import { TagHighlightField } from '../components/TagHighlightField';
import type { ModalLayerProps } from './types';
import { cn } from '../../../lib/cn';
import { dataTransferHasFiles } from '../imageFiles';
import { COMMUNITY_DIALOG_SURFACE_CLASS } from './dialogStyles';

export function CreateDialog(props: ModalLayerProps & { user: CommunityUser }) {
  const {
    ja,
    busy,
    error,
    close,
    postImages,
    updatePostImages,
    readPost,
    submitPost,
    suggestedTags,
    user,
  } = props;
  const imageInput = useRef<HTMLInputElement>(null);
  const captionInput = useRef<HTMLTextAreaElement>(null);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [tagSearch, setTagSearch] = useState<string | null>(null);
  const [activeTagIndex, setActiveTagIndex] = useState(-1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [draggedImage, setDraggedImage] = useState<number | null>(null);
  const [dragTargetImage, setDragTargetImage] = useState<number | null>(null);
  const [imageDropActive, setImageDropActive] = useState(false);
  const dragPreview = useRef<HTMLDivElement | null>(null);
  const imageDropDepth = useRef(0);

  useEffect(() => {
    if (selectedImage >= postImages.length) setSelectedImage(Math.max(0, postImages.length - 1));
  }, [postImages.length, selectedImage]);

  useEffect(
    () => () => {
      dragPreview.current?.remove();
    },
    [],
  );

  const removeDragPreview = () => {
    dragPreview.current?.remove();
    dragPreview.current = null;
  };

  const createDragPreview = (image: string, index: number) => {
    removeDragPreview();
    const preview = document.createElement('div');
    preview.className =
      'community-image-drag-preview tw-pointer-events-none tw-fixed tw-left-[-120px] tw-top-[-120px] tw-z-[2147483647] tw-h-[78px] tw-w-[78px] tw-overflow-hidden tw-rounded-[10px] tw-border-2 tw-border-white tw-bg-[#111] tw-shadow-2xl [&_img]:tw-block [&_img]:tw-h-full [&_img]:tw-w-full [&_img]:tw-object-cover [&_span]:tw-absolute [&_span]:tw-left-1.5 [&_span]:tw-top-1.5 [&_span]:tw-rounded-full [&_span]:tw-bg-black/75 [&_span]:tw-px-1.5 [&_span]:tw-py-0.5 [&_span]:tw-text-xs [&_span]:tw-text-white';
    const previewImage = document.createElement('img');
    previewImage.src = image;
    const badge = document.createElement('span');
    badge.textContent = String(index + 1);
    preview.append(previewImage, badge);
    (document.getElementById('portal-overlay') ?? document.body).appendChild(preview);
    dragPreview.current = preview;
    return preview;
  };

  const moveImage = (from: number, to: number) => {
    if (from === to) return;
    const next = [...postImages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updatePostImages(next);
    setSelectedImage(to);
  };

  const removeImage = (index: number) => {
    const next = postImages.filter((_, imageIndex) => imageIndex !== index);
    updatePostImages(next);
    setSelectedImage((current) => {
      if (!next.length) return 0;
      if (current === index) return Math.min(index, next.length - 1);
      return current > index ? current - 1 : current;
    });
  };

  const acceptsImageDrop = (event: DragEvent<HTMLElement>) =>
    draggedImage === null && dataTransferHasFiles(event.dataTransfer);

  const resetImageDrop = () => {
    imageDropDepth.current = 0;
    setImageDropActive(false);
  };

  const handleImageDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!acceptsImageDrop(event)) return;
    event.preventDefault();
    event.stopPropagation();
    imageDropDepth.current += 1;
    setImageDropActive(true);
    event.dataTransfer.dropEffect = postImages.length >= 4 ? 'none' : 'copy';
  };

  const handleImageDragOver = (event: DragEvent<HTMLElement>) => {
    if (!acceptsImageDrop(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = postImages.length >= 4 ? 'none' : 'copy';
  };

  const handleImageDragLeave = (event: DragEvent<HTMLElement>) => {
    if (!acceptsImageDrop(event)) return;
    event.preventDefault();
    event.stopPropagation();
    imageDropDepth.current = Math.max(0, imageDropDepth.current - 1);
    if (imageDropDepth.current === 0) setImageDropActive(false);
  };

  const handleImageDrop = (event: DragEvent<HTMLElement>) => {
    if (!acceptsImageDrop(event)) return;
    event.preventDefault();
    event.stopPropagation();
    resetImageDrop();
    if (postImages.length >= 4) return;
    readPost(event.dataTransfer.files);
  };

  const matchingTags = useMemo(() => {
    if (tagSearch === null) return [];
    const needle = tagSearch.toLocaleLowerCase();
    return suggestedTags
      .filter((tag) => !needle || tag.toLocaleLowerCase().includes(needle))
      .slice(0, 6);
  }, [suggestedTags, tagSearch]);

  const updateTagSearch = (value: string, caret: number | null) => {
    const beforeCaret = value.slice(0, caret ?? value.length);
    const match = beforeCaret.match(activeTagPattern);
    setActiveTagIndex(-1);
    setTagSearch(match ? match[1] : null);
  };

  const insertTag = (tag: string) => {
    const textarea = captionInput.current;
    if (!textarea) return;
    const caret = textarea.selectionStart ?? caption.length;
    const beforeCaret = caption.slice(0, caret);
    const match = beforeCaret.match(activeTagPattern);
    if (!match) return;
    const hashIndex = caret - match[1].length - 1;
    const replacement = `#${tag} `;
    const next = caption.slice(0, hashIndex) + replacement + caption.slice(caret);
    const nextCaret = hashIndex + replacement.length;
    setCaption(next);
    setTagSearch(null);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  return (
    <form
      className={`${COMMUNITY_DIALOG_SURFACE_CLASS} community-create-dialog tw-w-full tw-max-w-[980px]`}
      method="post"
      onSubmitCapture={(event) => event.preventDefault()}
      onSubmit={submitPost}
    >
      <DialogHeader title={ja ? '新しい投稿' : 'New post'} close={close} />
      <div
        className={
          'community-create-body tw-grid tw-grid-cols-[minmax(0,1.12fr)_minmax(320px,.88fr)] tw-gap-6 tw-bg-community-bg tw-p-6 max-[960px]:tw-grid-cols-[minmax(0,1fr)_320px] max-[760px]:tw-grid-cols-1 max-[620px]:tw-p-4 [&>.community-fields]:tw-flex [&>.community-fields]:tw-flex-col [&>.community-fields]:tw-rounded-xl [&>.community-fields]:tw-border [&>.community-fields]:tw-border-community-border-light [&>.community-fields]:tw-bg-community-bg2 [&>.community-fields]:tw-p-4'
        }
      >
        <section
          className={
            'community-image-composer tw-grid tw-min-w-0 tw-content-start tw-gap-3 tw-rounded-xl tw-border tw-border-community-border-light tw-bg-community-bg2 tw-p-3 [&>input]:tw-sr-only'
          }
          onDragEnter={handleImageDragEnter}
          onDragOver={handleImageDragOver}
          onDragLeave={handleImageDragLeave}
          onDrop={handleImageDrop}
        >
          <header
            className={
              'community-composer-media-head tw-flex tw-min-h-10 tw-items-center tw-justify-between tw-gap-3 [&>div]:tw-grid [&>div]:tw-min-w-0 [&>div]:tw-leading-snug [&_strong]:tw-text-sm [&_strong]:tw-text-community-bright [&_span]:tw-text-xs [&_span]:tw-text-community-muted [&>label]:tw-inline-flex [&>label]:tw-min-h-9 [&>label]:tw-items-center [&>label]:tw-gap-1 [&>label]:tw-rounded-lg [&>label]:tw-border [&>label]:tw-border-[var(--p-accent-border)] [&>label]:tw-bg-community-accent-bg [&>label]:tw-px-3 [&>label]:tw-text-[13px] [&>label]:tw-font-bold [&>label]:tw-text-community-accent-light [&>label]:tw-cursor-pointer [&_svg]:tw-h-4 [&_svg]:tw-w-4 [&_svg]:tw-fill-none [&_svg]:tw-stroke-current'
            }
          >
            <div>
              <strong>{ja ? '写真' : 'Photos'}</strong>
              <span>{ja ? '最大4枚・1枚6MBまで' : 'Up to 4 photos · 6MB each'}</span>
            </div>
            {postImages.length < 4 ? (
              <label htmlFor="community-post-images">
                <Glyph name="plus" />
                {postImages.length ? (ja ? '追加' : 'Add') : ja ? '選択' : 'Choose'}
              </label>
            ) : (
              <span>{postImages.length}/4</span>
            )}
          </header>
          <div
            className={cn(
              'community-composer-stage tw-relative tw-grid tw-aspect-[4/3] tw-min-h-0 tw-place-items-center tw-overflow-hidden tw-rounded-[11px] tw-border tw-border-dashed tw-border-[var(--p-border-hover)] tw-bg-community-bg tw-transition [&.has-image]:tw-border-solid [&.has-image]:tw-border-community-border [&.has-image]:tw-bg-[#08090d] [&.is-file-dragging]:tw-border-community-accent [&.is-file-dragging]:tw-ring-2 [&.is-file-dragging]:tw-ring-community-accent-bg [&>img]:tw-absolute [&>img]:tw-inset-4 [&>img]:tw-block [&>img]:tw-h-[calc(100%-32px)] [&>img]:tw-w-[calc(100%-32px)] [&>img]:tw-object-contain max-[620px]:[&>img]:tw-inset-2 max-[620px]:[&>img]:tw-h-[calc(100%-16px)] max-[620px]:[&>img]:tw-w-[calc(100%-16px)]',
              postImages.length > 0 && 'has-image',
              imageDropActive && 'is-file-dragging',
            )}
          >
            {postImages.length ? (
              <img src={postImages[selectedImage]} alt="" />
            ) : (
              <label
                className={
                  'community-composer-empty tw-grid tw-h-full tw-w-full tw-place-content-center tw-justify-items-center tw-gap-2 tw-p-6 tw-text-center tw-text-community-muted tw-cursor-pointer hover:tw-bg-[var(--p-bg-hover)] [&_svg]:tw-mb-1 [&_svg]:tw-h-[38px] [&_svg]:tw-w-[38px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-community-accent-light [&_strong]:tw-text-base [&_strong]:tw-text-community-bright [&_span]:tw-text-[13px] [&_small]:tw-text-xs'
                }
                htmlFor="community-post-images"
              >
                <Glyph name="image" />
                <strong>{ja ? '投稿する写真を追加' : 'Add photos'}</strong>
                <span>{ja ? 'クリックして写真を選択' : 'Click to choose photos'}</span>
                <small>JPEG / PNG / WebP</small>
              </label>
            )}
          </div>
          {postImages.length ? (
            <div
              className={
                'community-composer-filmstrip tw-grid tw-gap-2 [&>p]:tw-m-0 [&>p]:tw-flex [&>p]:tw-items-center [&>p]:tw-justify-center [&>p]:tw-gap-1 [&>p]:tw-text-xs [&>p]:tw-text-community-muted'
              }
            >
              <div
                className={
                  'community-composer-filmstrip-list tw-grid tw-grid-cols-6 tw-gap-2 max-[620px]:tw-grid-cols-3'
                }
              >
                {postImages.map((image, index) => (
                  <div
                    className={cn(
                      'community-composer-thumb tw-relative tw-aspect-square tw-min-w-0 tw-rounded-[9px] tw-border-2 tw-border-transparent tw-bg-community-bg3 tw-cursor-grab tw-transition [&.is-selected]:tw-border-community-accent [&.is-selected]:tw-ring-2 [&.is-selected]:tw-ring-community-accent-bg [&.is-dragging]:tw-scale-95 [&.is-dragging]:tw-opacity-20 [&.is-drop-target]:tw-translate-y-[-3px] [&.is-drop-target]:tw-border-community-accent-light [&.is-drop-target]:tw-shadow-lg',
                      selectedImage === index && 'is-selected',
                      draggedImage === index && 'is-dragging',
                      dragTargetImage === index && draggedImage !== index && 'is-drop-target',
                    )}
                    draggable
                    key={`${image.slice(-24)}-${index}`}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(index));
                      event.dataTransfer.setDragImage(createDragPreview(image, index), 39, 39);
                      setDraggedImage(index);
                    }}
                    onDragEnd={() => {
                      removeDragPreview();
                      setDraggedImage(null);
                      setDragTargetImage(null);
                    }}
                    onDragEnter={(event) => {
                      if (dataTransferHasFiles(event.dataTransfer)) return;
                      setDragTargetImage(index);
                    }}
                    onDragOver={(event) => {
                      if (dataTransferHasFiles(event.dataTransfer)) return;
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => {
                      if (dataTransferHasFiles(event.dataTransfer)) return;
                      event.preventDefault();
                      event.stopPropagation();
                      const source =
                        draggedImage ?? Number(event.dataTransfer.getData('text/plain'));
                      if (Number.isInteger(source)) moveImage(source, index);
                      removeDragPreview();
                      setDraggedImage(null);
                      setDragTargetImage(null);
                    }}
                  >
                    <button
                      className={
                        'community-composer-thumb-preview tw-block tw-h-full tw-w-full tw-overflow-hidden tw-rounded-[7px] tw-border-0 tw-bg-transparent tw-p-0 [&_img]:tw-block [&_img]:tw-h-full [&_img]:tw-w-full [&_img]:tw-object-cover [&_span]:tw-absolute [&_span]:tw-bottom-1 [&_span]:tw-left-1 [&_span]:tw-min-w-5 [&_span]:tw-rounded-md [&_span]:tw-bg-black/70 [&_span]:tw-px-1.5 [&_span]:tw-py-px [&_span]:tw-text-xs [&_span]:tw-leading-[18px] [&_span]:tw-text-white'
                      }
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      aria-label={`${ja ? '写真' : 'Photo'} ${index + 1}`}
                    >
                      <img src={image} alt="" />
                      <span>{index + 1}</span>
                    </button>
                    <button
                      className={
                        'community-composer-thumb-remove tw-absolute tw-right-1 tw-top-1 tw-z-[2] tw-grid tw-h-6 tw-w-6 tw-place-items-center tw-rounded-md tw-border tw-border-white/30 tw-bg-black/70 tw-p-0 tw-text-white tw-opacity-80 tw-cursor-pointer hover:tw-opacity-100 focus-visible:tw-opacity-100 [&_svg]:tw-h-3 [&_svg]:tw-w-3 [&_svg]:tw-fill-none [&_svg]:tw-stroke-current'
                      }
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label={ja ? `写真${index + 1}を削除` : `Remove photo ${index + 1}`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <p>
                <span aria-hidden="true">⠿</span>
                {ja ? 'ドラッグして表示順を変更' : 'Drag to change the order'}
              </p>
            </div>
          ) : null}
          <input
            id="community-post-images"
            ref={imageInput}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              readPost(event.currentTarget.files);
              event.currentTarget.value = '';
            }}
          />
        </section>
        <div className={'community-fields tw-grid tw-min-w-0 tw-content-start tw-gap-4'}>
          <div
            className={
              'community-posting-user tw-flex tw-items-center tw-gap-3 tw-border-b tw-border-community-border tw-pb-3 [&>span]:tw-grid [&>span]:tw-min-w-0 [&_strong]:tw-text-sm [&_strong]:tw-text-community-bright [&_small]:tw-text-xs [&_small]:tw-text-community-muted'
            }
          >
            <Avatar user={user} />
            <span>
              <strong>{user.displayName}</strong>
              <small>@{user.loginId}</small>
            </span>
          </div>
          <Field
            label={ja ? 'タイトル' : 'Title'}
            meta={<CharacterCount value={title} max={COMMUNITY_INPUT_LIMITS.postTitle} />}
          >
            <input
              name="title"
              maxLength={COMMUNITY_INPUT_LIMITS.postTitle}
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              placeholder={ja ? '投稿のタイトル' : 'Give your post a title'}
              required
            />
          </Field>
          <div className={'community-caption-field tw-relative'}>
            <BareField
              label={ja ? '本文' : 'Caption'}
              meta={<CharacterCount value={caption} max={COMMUNITY_INPUT_LIMITS.postCaption} />}
            >
              <TagHighlightField
                multiline
                ref={captionInput}
                name="caption"
                rows={7}
                maxLength={COMMUNITY_INPUT_LIMITS.postCaption}
                value={caption}
                spellCheck={false}
                placeholder={
                  ja
                    ? '活動について書いてみましょう。\n**太字** *斜体* ~~取消~~ `コード` > 引用 が使えます。\nhttps://... または [リンク](https://...) 。\n# を入力するとタグを追加できます。'
                    : 'Tell everyone about this activity.\n**bold** *italic* ~~strike~~ `code` > quote supported.\nUse https://... or [links](https://...).\nType # to add a tag.'
                }
                onChange={(event) => {
                  setCaption(event.currentTarget.value);
                  updateTagSearch(event.currentTarget.value, event.currentTarget.selectionStart);
                }}
                onClick={(event) =>
                  updateTagSearch(event.currentTarget.value, event.currentTarget.selectionStart)
                }
                onBlur={() => setTagSearch(null)}
                onKeyDown={(event) => {
                  if (tagSearch === null || matchingTags.length === 0) return;
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveTagIndex((index) => advanceTagSuggestionIndex(index, matchingTags.length, 1));
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveTagIndex((index) => advanceTagSuggestionIndex(index, matchingTags.length, -1));
                  } else if (event.key === 'Tab') {
                    event.preventDefault();
                    setActiveTagIndex((index) =>
                      advanceTagSuggestionIndex(index, matchingTags.length, event.shiftKey ? -1 : 1),
                    );
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    insertTag(matchingTags[activeTagIndex >= 0 ? activeTagIndex : 0] ?? matchingTags[0]);
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === 'Escape') setTagSearch(null);
                  else if (!['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key))
                    updateTagSearch(event.currentTarget.value, event.currentTarget.selectionStart);
                }}
                required
              />
            </BareField>
            {tagSearch !== null ? (
              <div
                className={COMMUNITY_TAG_SUGGESTIONS_SURFACE_CLASS}
                role="listbox"
                aria-label={ja ? 'タグ候補' : 'Tag suggestions'}
              >
                <header>
                  <span>{ja ? 'タグ候補' : 'Suggested tags'}</span>
                  <small>{ja ? 'Tab で移動 / Enter で追加' : 'Tab to move / Enter to insert'}</small>
                </header>
                {matchingTags.length ? (
                  matchingTags.map((item, index) => (
                    <button
                      className={cn(index === activeTagIndex && 'is-active')}
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={index === activeTagIndex}
                      onMouseEnter={() => setActiveTagIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => insertTag(item)}
                    >
                      <b>#</b>
                      <span>{item}</span>
                    </button>
                  ))
                ) : tagSearch ? (
                  <div className={COMMUNITY_TAG_NEW_CLASS}>
                    <b>#{tagSearch}</b>
                    <span>{ja ? '新しいタグとして投稿できます' : 'This will be a new tag'}</span>
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
          </div>
          <p className={'community-help tw-m-0 tw-text-[13px] tw-text-community-muted'}>
            {ja ? '投稿は運営による審査後に公開されます。' : 'Posts are published after review.'}
          </p>
          <ErrorMessage text={error} />
        </div>
      </div>
      <footer>
        <button type="button" onClick={close}>
          {ja ? 'キャンセル' : 'Cancel'}
        </button>
        <button
          className={
            'is-primary tw-border-community-accent tw-bg-community-accent tw-text-community-on-accent hover:tw-translate-y-[-1px] hover:tw-brightness-110 hover:tw-shadow-community-card'
          }
          disabled={busy || !postImages.length}
        >
          {busy ? <Busy /> : null}
          {ja ? '審査へ送信' : 'Submit'}
        </button>
      </footer>
    </form>
  );
}
