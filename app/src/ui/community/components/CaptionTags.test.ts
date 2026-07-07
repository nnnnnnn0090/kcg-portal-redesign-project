import { describe, expect, it } from 'vitest';
import { isValidElement } from 'react';
import { renderCaptionWithTags, safeCaptionHttpUrl } from './CaptionTags';

describe('safeCaptionHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(safeCaptionHttpUrl('https://example.com/path')).toBe('https://example.com/path');
    expect(safeCaptionHttpUrl('http://example.com')).toBe('http://example.com/');
  });

  it('trims trailing punctuation from URLs', () => {
    expect(safeCaptionHttpUrl('https://example.com/page).')).toBe('https://example.com/page');
  });

  it('rejects non-http schemes', () => {
    expect(safeCaptionHttpUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('renderCaptionWithTags', () => {
  it('preserves line breaks in plain text', () => {
    const nodes = renderCaptionWithTags('1行目\n2行目');
    expect(nodes.some((node) => isValidElement(node) && node.type === 'br')).toBe(true);
  });

  it('does not linkify URLs in preview mode', () => {
    const nodes = renderCaptionWithTags('see https://example.com', { linkifyUrls: false });
    expect(nodes.some((node) => isValidElement(node) && node.type === 'a')).toBe(false);
    expect(
      nodes
        .filter((node): node is string => typeof node === 'string')
        .join(''),
    ).toContain('https://example.com');
  });
});
