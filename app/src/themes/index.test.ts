import { describe, expect, it } from 'vitest';
import { THEMES } from './definitions';
import { getThemeCss } from './index';

describe('theme CSS variables', () => {
  it('アクセント面専用の前景色を出力する', () => {
    expect(getThemeCss(THEMES.pink)).toContain('--p-on-accent:#ffffff');
    expect(getThemeCss(THEMES.stone)).toContain('--p-on-accent:#000000');
  });
});
