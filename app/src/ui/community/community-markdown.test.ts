/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { renderCommunityMarkdown } from './community-markdown';

describe('renderCommunityMarkdown', () => {
  it('autolinks bare http(s) URLs with rel noopener', () => {
    const html = renderCommunityMarkdown('see https://example.com now');
    expect(html).toContain('href="https://example.com/');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('<script');
  });

  it('renders secure markdown links', () => {
    const html = renderCommunityMarkdown('[Example](https://example.com)');
    expect(html).toContain('href="https://example.com/');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Example');
  });

  it('strips javascript URLs from markdown links', () => {
    const html = renderCommunityMarkdown('[bad](javascript:alert(1))');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('bad');
  });

  it('rejects protocol-relative and data URLs', () => {
    expect(renderCommunityMarkdown('//evil.example')).not.toContain('<a');
    expect(renderCommunityMarkdown('data:text/html,alert(1)')).not.toContain('<a');
    expect(renderCommunityMarkdown('[x](//evil.example)')).not.toContain('<a');
  });

  it('does not autolink javascript URLs', () => {
    const html = renderCommunityMarkdown('<javascript:alert(1)>');
    expect(html).not.toContain('<a');
  });

  it('keeps body text plain while only links are anchors', () => {
    const html = renderCommunityMarkdown('plain **bold** https://example.com');
    expect(html).toContain('plain');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toMatch(/plain[\s\S]*<strong>bold<\/strong>[\s\S]*<a /);
  });

  it('strips script tags and event handlers', () => {
    const html = renderCommunityMarkdown('<script>alert(1)</script> **bold**');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
    expect(html).toContain('bold');
  });

  it('renders emphasis and strike', () => {
    const html = renderCommunityMarkdown('**bold** *italic* ~~strike~~');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<del>strike</del>');
  });

  it('renders inline and fenced code', () => {
    const html = renderCommunityMarkdown('`inline`\n\n```\nblock\n```');
    expect(html).toContain('<code>inline</code>');
    expect(html).toContain('<pre>');
  });

  it('renders blockquotes', () => {
    const html = renderCommunityMarkdown('> quoted');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('quoted');
  });

  it('does not render lists or headings', () => {
    const html = renderCommunityMarkdown('# heading\n- item\n1. numbered');
    expect(html).not.toContain('<h1');
    expect(html).not.toContain('<ul');
    expect(html).not.toContain('<ol');
    expect(html).not.toContain('<li');
  });

  it('renders hashtags as interactive buttons in full mode', () => {
    const html = renderCommunityMarkdown('hello #campus');
    expect(html).toContain('data-community-tag="campus"');
    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).toContain('community-caption-tag');
    expect(html).toContain('tw-text-community-accent-light');
  });

  it('keeps hashtags plain in preview mode', () => {
    const html = renderCommunityMarkdown('hello #campus', { preview: true });
    expect(html).not.toContain('<button');
    expect(html).toContain('#campus');
  });

  it('does not render autolinks in preview mode', () => {
    const html = renderCommunityMarkdown('https://example.com', { preview: true });
    expect(html).not.toContain('<a');
    expect(html).toContain('example.com');
  });

  it('preserves line breaks', () => {
    const html = renderCommunityMarkdown('1行目\n2行目');
    expect(html).toMatch(/1行目/);
    expect(html).toMatch(/2行目/);
  });

  it('does not allow raw html injection', () => {
    const html = renderCommunityMarkdown('<img src=x onerror=alert(1)> **bold**');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('onerror');
    expect(html).toContain('bold');
  });
});
