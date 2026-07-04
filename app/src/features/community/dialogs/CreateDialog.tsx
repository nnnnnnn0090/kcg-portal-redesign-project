import { useEffect, useMemo, useRef, useState } from 'react';
import { activeTagPattern } from '../constants';
import type { CommunityUser } from '../types';
import { Avatar } from '../components/Avatar';
import { Busy, DialogHeader, ErrorMessage, Field } from '../components/FormUi';
import { Glyph } from '../components/Glyph';
import type { ModalLayerProps } from './types';

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
  const [tagSearch, setTagSearch] = useState<string | null>(null);
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [draggedImage, setDraggedImage] = useState<number | null>(null);
  const [dragTargetImage, setDragTargetImage] = useState<number | null>(null);
  const dragPreview = useRef<HTMLDivElement | null>(null);

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
    preview.className = 'community-image-drag-preview';
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
    setActiveTagIndex(0);
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
      className="community-dialog community-create-dialog"
      method="post"
      onSubmitCapture={(event) => event.preventDefault()}
      onSubmit={submitPost}
    >
      <DialogHeader title={ja ? '新しい投稿' : 'New post'} close={close} />
      <div className="community-create-body">
        <section className="community-image-composer">
          <header className="community-composer-media-head">
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
          <div className={`community-composer-stage${postImages.length ? ' has-image' : ''}`}>
            {postImages.length ? (
              <img src={postImages[selectedImage]} alt="" />
            ) : (
              <label className="community-composer-empty" htmlFor="community-post-images">
                <Glyph name="image" />
                <strong>{ja ? '投稿する写真を追加' : 'Add photos'}</strong>
                <span>{ja ? 'クリックして写真を選択' : 'Click to choose photos'}</span>
                <small>JPEG / PNG / WebP</small>
              </label>
            )}
          </div>
          {postImages.length ? (
            <div className="community-composer-filmstrip">
              <div className="community-composer-filmstrip-list">
                {postImages.map((image, index) => (
                  <div
                    className={`community-composer-thumb${selectedImage === index ? ' is-selected' : ''}${draggedImage === index ? ' is-dragging' : ''}${dragTargetImage === index && draggedImage !== index ? ' is-drop-target' : ''}`}
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
                    onDragEnter={() => setDragTargetImage(index)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const source =
                        draggedImage ?? Number(event.dataTransfer.getData('text/plain'));
                      if (Number.isInteger(source)) moveImage(source, index);
                      removeDragPreview();
                      setDraggedImage(null);
                      setDragTargetImage(null);
                    }}
                  >
                    <button
                      className="community-composer-thumb-preview"
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      aria-label={`${ja ? '写真' : 'Photo'} ${index + 1}`}
                    >
                      <img src={image} alt="" />
                      <span>{index + 1}</span>
                    </button>
                    <button
                      className="community-composer-thumb-remove"
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
        <div className="community-fields">
          <div className="community-posting-user">
            <Avatar user={user} />
            <span>
              <strong>{user.displayName}</strong>
              <small>@{user.loginId}</small>
            </span>
          </div>
          <Field label={ja ? 'タイトル' : 'Title'}>
            <input
              name="title"
              maxLength={80}
              placeholder={ja ? '投稿のタイトル' : 'Give your post a title'}
              required
            />
          </Field>
          <div className="community-caption-field">
            <Field label={ja ? '本文' : 'Caption'}>
              <textarea
                ref={captionInput}
                name="caption"
                rows={7}
                maxLength={1000}
                value={caption}
                placeholder={
                  ja
                    ? '活動について書いてみましょう。\n# を入力するとタグを追加できます。'
                    : 'Tell everyone about this activity.\nType # to add a tag.'
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
                    setActiveTagIndex((index) => (index + 1) % matchingTags.length);
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveTagIndex(
                      (index) => (index - 1 + matchingTags.length) % matchingTags.length,
                    );
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    insertTag(matchingTags[activeTagIndex] ?? matchingTags[0]);
                  }
                }}
                onKeyUp={(event) => {
                  if (event.key === 'Escape') setTagSearch(null);
                  else if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key))
                    updateTagSearch(event.currentTarget.value, event.currentTarget.selectionStart);
                }}
                required
              />
            </Field>
            {tagSearch !== null ? (
              <div
                className="community-tag-suggestions"
                role="listbox"
                aria-label={ja ? 'タグ候補' : 'Tag suggestions'}
              >
                <header>
                  <span>{ja ? 'タグ候補' : 'Suggested tags'}</span>
                  <small>{ja ? '選択して本文に追加' : 'Select to insert'}</small>
                </header>
                {matchingTags.length ? (
                  matchingTags.map((item, index) => (
                    <button
                      className={index === activeTagIndex ? 'is-active' : ''}
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
                  <div className="community-tag-new">
                    <b>#{tagSearch}</b>
                    <span>{ja ? '新しいタグとして投稿できます' : 'This will be a new tag'}</span>
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
          </div>
          <p className="community-help">
            {ja ? '投稿は運営による審査後に公開されます。' : 'Posts are published after review.'}
          </p>
          <ErrorMessage text={error} />
        </div>
      </div>
      <footer>
        <button type="button" onClick={close}>
          {ja ? 'キャンセル' : 'Cancel'}
        </button>
        <button className="is-primary" disabled={busy || !postImages.length}>
          {busy ? <Busy /> : null}
          {ja ? '審査へ送信' : 'Submit'}
        </button>
      </footer>
    </form>
  );
}
