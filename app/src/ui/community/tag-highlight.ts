import { TAG_CHARS } from './constants';

const INLINE_TAG_PATTERN = new RegExp(`(^|\\s)([#＃][${TAG_CHARS}]{1,30})`, 'gu');

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderInputTagHighlightHtml(text: string): string {
  if (!text) return '';
  let html = '';
  let lastIndex = 0;
  for (const match of text.matchAll(INLINE_TAG_PATTERN)) {
    const index = match.index ?? 0;
    html += escapeHtml(text.slice(lastIndex, index));
    html += escapeHtml(match[1] ?? '');
    html += `<span class="community-input-tag-highlight">${escapeHtml(match[2] ?? '')}</span>`;
    lastIndex = index + match[0].length;
  }
  html += escapeHtml(text.slice(lastIndex));
  return html;
}
