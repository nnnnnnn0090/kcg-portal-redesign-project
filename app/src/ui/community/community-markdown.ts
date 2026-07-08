import DOMPurify from 'dompurify';
import { Marked, type TokenizerAndRendererExtension } from 'marked';

/** Minimal chat formatting: bold, italic, strike, inline/code blocks, blockquote, URL autolink. */
export const COMMUNITY_CAPTION_TAG_BUTTON_CLASS =
  'community-caption-tag tw-inline tw-cursor-pointer tw-appearance-none tw-border-0 tw-bg-transparent tw-p-0 tw-m-0 tw-font-inherit tw-text-community-accent-light hover:!tw-text-community-accent hover:!tw-brightness-100 active:!tw-scale-100';

const COMMUNITY_TAG_PATTERN = /^[#＃]([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]{1,30})/u;
const COMMUNITY_TAG_CONTENT_PATTERN = /^[A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]{1,30}$/u;
const EXTERNAL_URL_PATTERN = /^https?:\/\//i;

const COMMUNITY_ALLOWED_TAGS = [
  'a',
  'blockquote',
  'br',
  'button',
  'code',
  'del',
  'em',
  'p',
  'pre',
  'span',
  'strong',
] as const;

const COMMUNITY_ALLOWED_ATTR = [
  'class',
  'data-community-tag',
  'href',
  'rel',
  'target',
  'type',
] as const;

let purifyConfigured = false;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function trimUrlTrailingPunctuation(value: string): string {
  return value.replace(/[)\]}>,.;:!?]+$/u, '');
}

function normalizeExternalUrl(raw: string): URL | null {
  const value = trimUrlTrailingPunctuation(raw.trim());
  if (!value || !EXTERNAL_URL_PATTERN.test(value)) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function renderSafeLink(href: string, label: string): string {
  const url = normalizeExternalUrl(href);
  if (!url) {
    return escapeHtml(label || href);
  }
  const safeHref = escapeHtml(url.href);
  const safeLabel = escapeHtml(label || url.href);
  return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
}

function configurePurify(): void {
  if (purifyConfigured) return;
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'href') {
      if (!normalizeExternalUrl(data.attrValue)) {
        data.keepAttr = false;
      }
      return;
    }
    if (data.attrName === 'data-community-tag') {
      if (!COMMUNITY_TAG_CONTENT_PATTERN.test(data.attrValue)) {
        data.keepAttr = false;
      }
    }
  });
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element)) return;
    if (node.tagName === 'A' && node.hasAttribute('href')) {
      const url = normalizeExternalUrl(node.getAttribute('href') ?? '');
      if (!url) {
        node.replaceWith(node.textContent ?? '');
        return;
      }
      node.setAttribute('href', url.href);
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
      return;
    }
    if (node.tagName === 'BUTTON' && node.hasAttribute('data-community-tag')) {
      const tag = node.getAttribute('data-community-tag') ?? '';
      if (!COMMUNITY_TAG_CONTENT_PATTERN.test(tag)) {
        node.replaceWith(node.textContent ?? '');
        return;
      }
      node.setAttribute('type', 'button');
    }
  });
  purifyConfigured = true;
}

function communityTagExtension(interactiveTags: boolean): TokenizerAndRendererExtension {
  return {
    name: 'communityTag',
    level: 'inline',
    start(src) {
      const index = src.search(/[#＃]/);
      return index >= 0 ? index : undefined;
    },
    tokenizer(src) {
      const match = COMMUNITY_TAG_PATTERN.exec(src);
      if (!match) return undefined;
      return {
        type: 'communityTag',
        raw: match[0],
        text: match[1],
      };
    },
    renderer(token) {
      const tag = 'text' in token && typeof token.text === 'string' ? token.text : '';
      if (!tag || !COMMUNITY_TAG_CONTENT_PATTERN.test(tag)) {
        return 'text' in token && typeof token.raw === 'string' ? escapeHtml(token.raw) : '';
      }
      if (interactiveTags) {
        return `<button type="button" class="${COMMUNITY_CAPTION_TAG_BUTTON_CLASS}" data-community-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`;
      }
      return `#${escapeHtml(tag)}`;
    },
  };
}

function createCommunityMarked(interactiveTags: boolean): Marked {
  const parser = new Marked({
    async: false,
    breaks: true,
    gfm: true,
  });
  parser.use({
    extensions: [communityTagExtension(interactiveTags)],
    tokenizer: {
      heading() {
        return undefined;
      },
      lheading() {
        return undefined;
      },
      list() {
        return undefined;
      },
      hr() {
        return undefined;
      },
      table() {
        return undefined;
      },
      html() {
        return undefined;
      },
    },
    renderer: {
      link({ href, text }) {
        const label = typeof text === 'string' ? text : '';
        const target = typeof href === 'string' ? href : '';
        return renderSafeLink(target, label);
      },
    },
  });
  return parser;
}

const fullCommunityMarked = createCommunityMarked(true);
const previewCommunityMarked = createCommunityMarked(false);

function sanitizeCommunityHtml(html: string): string {
  configurePurify();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...COMMUNITY_ALLOWED_TAGS],
    ALLOWED_ATTR: [...COMMUNITY_ALLOWED_ATTR],
    ALLOWED_URI_REGEXP: /^https?:/i,
  });
}

function hardenLinks(doc: Document): void {
  for (const anchor of doc.body.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') ?? '';
    const url = normalizeExternalUrl(href);
    if (!url) {
      anchor.replaceWith(anchor.textContent ?? '');
      continue;
    }
    anchor.setAttribute('href', url.href);
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  }
}

function hardenTagButtons(doc: Document): void {
  for (const button of doc.body.querySelectorAll('button')) {
    const tag = button.getAttribute('data-community-tag') ?? '';
    if (!COMMUNITY_TAG_CONTENT_PATTERN.test(tag)) {
      button.replaceWith(button.textContent ?? '');
    }
  }
}

function flattenLinksToText(doc: Document): void {
  for (const anchor of doc.body.querySelectorAll('a[href]')) {
    const span = doc.createElement('span');
    span.className = 'community-caption-plain-link';
    span.textContent = anchor.textContent ?? '';
    anchor.replaceWith(span);
  }
}

function finalizeCommunityHtml(html: string, preview: boolean): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  hardenLinks(doc);
  hardenTagButtons(doc);
  if (preview) flattenLinksToText(doc);
  return doc.body.innerHTML;
}

export function renderCommunityMarkdown(
  raw: string,
  options: { preview?: boolean } = {},
): string {
  const source = String(raw ?? '');
  if (!source.trim()) return '';
  const parser = options.preview ? previewCommunityMarked : fullCommunityMarked;
  const parsed = parser.parse(source) as string;
  const finalized = finalizeCommunityHtml(parsed, Boolean(options.preview));
  return sanitizeCommunityHtml(finalized);
}
