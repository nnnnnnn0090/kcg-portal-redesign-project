import type { MouseEvent, ReactNode } from 'react';

const tagPattern = /[#＃]([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]{1,30})/gu;
const urlPattern = /https?:\/\/[^\s<>"']+/gi;

type CaptionMatch =
  | { kind: 'tag'; index: number; raw: string; tag: string }
  | { kind: 'url'; index: number; raw: string; href: string; label: string };

function trimUrlTrailingPunctuation(value: string): string {
  return value.replace(/[)\]}>,.;:!?]+$/u, '');
}

export function safeCaptionHttpUrl(raw: string): string | null {
  const trimmed = trimUrlTrailingPunctuation(raw);
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

function nextCaptionMatch(
  caption: string,
  from: number,
  linkifyUrls: boolean,
): CaptionMatch | null {
  tagPattern.lastIndex = from;
  urlPattern.lastIndex = from;
  const tagMatch = tagPattern.exec(caption);
  const urlMatch = linkifyUrls ? urlPattern.exec(caption) : null;

  let best: CaptionMatch | null = null;

  if (tagMatch?.index !== undefined) {
    best = { kind: 'tag', index: tagMatch.index, raw: tagMatch[0], tag: tagMatch[1] };
  }

  if (urlMatch?.index !== undefined) {
    const href = safeCaptionHttpUrl(urlMatch[0]);
    if (href) {
      const candidate: CaptionMatch = {
        kind: 'url',
        index: urlMatch.index,
        raw: urlMatch[0],
        href,
        label: trimUrlTrailingPunctuation(urlMatch[0]),
      };
      if (!best || candidate.index < best.index) best = candidate;
    }
  }

  return best;
}

function stopCardActivation(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function appendTextWithBreaks(nodes: ReactNode[], text: string, nextKey: () => number): void {
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (line) nodes.push(line);
    if (index < lines.length - 1) nodes.push(<br key={`br-${nextKey()}`} />);
  });
}

export type RenderCaptionOptions = {
  onTagClick?: (tag: string) => void;
  linkifyUrls?: boolean;
};

export function renderCaptionWithTags(
  caption: string,
  options: RenderCaptionOptions = {},
): ReactNode[] {
  const { onTagClick, linkifyUrls = true } = options;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  const nextKey = () => key++;

  while (cursor < caption.length) {
    const match = nextCaptionMatch(caption, cursor, linkifyUrls);
    if (!match) {
      if (cursor < caption.length) appendTextWithBreaks(nodes, caption.slice(cursor), nextKey);
      break;
    }

    if (match.index > cursor) {
      appendTextWithBreaks(nodes, caption.slice(cursor, match.index), nextKey);
    }

    if (match.kind === 'tag') {
      if (onTagClick) {
        nodes.push(
          <button
            className={
              'community-caption-tag tw-inline tw-border-0 tw-bg-transparent tw-p-0 tw-font-inherit tw-text-community-accent-light tw-cursor-pointer'
            }
            key={`tag-${nextKey()}`}
            type="button"
            onClick={(event) => {
              stopCardActivation(event);
              onTagClick(match.tag);
            }}
          >
            #{match.tag}
          </button>,
        );
      } else {
        nodes.push(`#${match.tag}`);
      }
      cursor = match.index + match.raw.length;
      continue;
    }

    nodes.push(
      <a
        className={
          'community-caption-link tw-break-all tw-font-inherit tw-text-community-accent-light tw-underline tw-underline-offset-2 hover:tw-text-community-accent'
        }
        href={match.href}
        key={`link-${nextKey()}`}
        rel="noopener noreferrer"
        target="_blank"
        onClick={stopCardActivation}
      >
        {match.label}
      </a>,
    );
    cursor = match.index + match.raw.length;
  }

  return nodes.length ? nodes : [caption];
}
