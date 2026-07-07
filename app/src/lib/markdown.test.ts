/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';
import { sanitizeHostHtml } from './dom';

describe('markdown', () => {
  it('renders safe links with rel noopener', () => {
    const html = renderMarkdown('[Example](https://example.com)');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('<script');
  });

  it('strips javascript URLs from images', () => {
    const html = renderMarkdown('![x](javascript:alert(1))');
    expect(html).not.toContain('javascript:');
  });
});

describe('sanitizeHostHtml', () => {
  it('allows basic announcement markup', () => {
    const html = sanitizeHostHtml('<p>Hello <strong>world</strong></p>');
    expect(html).toContain('<strong>world</strong>');
  });

  it('removes script tags', () => {
    const html = sanitizeHostHtml('<p>ok</p><script>alert(1)</script>');
    expect(html).not.toContain('script');
    expect(html).toContain('ok');
  });
});
