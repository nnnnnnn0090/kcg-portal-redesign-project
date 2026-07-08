import { describe, expect, it } from 'vitest';
import { renderInputTagHighlightHtml } from './tag-highlight';

describe('renderInputTagHighlightHtml', () => {
  it('highlights inline hashtags', () => {
    const html = renderInputTagHighlightHtml('hello #cpp world');
    expect(html).toContain('<span class="community-input-tag-highlight">#cpp</span>');
    expect(html).toContain('hello ');
  });

  it('does not highlight markdown-style headings', () => {
    const html = renderInputTagHighlightHtml('# heading');
    expect(html).not.toContain('community-input-tag-highlight');
  });

  it('escapes html in source text', () => {
    const html = renderInputTagHighlightHtml('<script>#cpp</script>');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });
});
