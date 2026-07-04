import type { ReactNode } from 'react';

export function renderCaptionWithTags(
  caption: string,
  onTagClick: (tag: string) => void,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tagPattern = /[#＃]([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]{1,30})/gu;
  let lastIndex = 0;
  let key = 0;

  for (const match of caption.matchAll(tagPattern)) {
    const index = match.index ?? 0;
    const tag = match[1];
    if (index > lastIndex) nodes.push(caption.slice(lastIndex, index));
    nodes.push(
      <button
        className={
          'community-caption-tag tw-inline tw-border-0 tw-bg-transparent tw-p-0 tw-font-inherit tw-text-community-accent-light tw-cursor-pointer'
        }
        key={`tag-${key++}`}
        type="button"
        onClick={() => onTagClick(tag)}
      >
        #{tag}
      </button>,
    );
    lastIndex = index + match[0].length;
  }

  if (lastIndex < caption.length) nodes.push(caption.slice(lastIndex));
  return nodes;
}
