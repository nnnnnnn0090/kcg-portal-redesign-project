import { describe, expect, it } from 'vitest';
import { isLostPropertyNews } from './news-classification';

describe('isLostPropertyNews', () => {
  it('タイトルに「拾得物のお知らせ」を含むお知らせを分類する', () => {
    expect(isLostPropertyNews({ title: '【学生課】拾得物のお知らせ（7月1日）' })).toBe(true);
  });

  it('通常のお知らせは分類しない', () => {
    expect(isLostPropertyNews({ title: '休講のお知らせ' })).toBe(false);
  });
});
