import DOMPurify from 'dompurify';
import { marked } from 'marked';

const ALLOWED_TAGS = [
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
] as const;

const ALLOWED_ATTR = ['alt', 'height', 'href', 'src', 'title', 'width'] as const;

marked.use({
  async: false,
  breaks: true,
  gfm: true,
});

function hardenLinks(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const a of doc.body.querySelectorAll('a[href]')) {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  }
  for (const img of doc.body.querySelectorAll('img[src]')) {
    const src = img.getAttribute('src') ?? '';
    try {
      const url = new URL(src, location.href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        img.remove();
        continue;
      }
      img.setAttribute('src', url.href);
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    } catch {
      img.remove();
    }
  }
  return doc.body.innerHTML;
}

export function renderMarkdown(raw: string): string {
  const parsed = marked.parse(String(raw ?? ''), { async: false }) as string;
  const sanitized = DOMPurify.sanitize(parsed, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
  });
  return hardenLinks(sanitized);
}
