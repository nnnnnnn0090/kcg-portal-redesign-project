import { describe, expect, it } from 'vitest';
import { advanceTagSuggestionIndex } from './constants';

describe('advanceTagSuggestionIndex', () => {
  it('starts at the first item on the first Tab press', () => {
    expect(advanceTagSuggestionIndex(-1, 3, 1)).toBe(0);
    expect(advanceTagSuggestionIndex(0, 3, 1)).toBe(1);
    expect(advanceTagSuggestionIndex(1, 3, 1)).toBe(2);
    expect(advanceTagSuggestionIndex(2, 3, 1)).toBe(0);
  });

  it('moves backward with shift-tab semantics', () => {
    expect(advanceTagSuggestionIndex(-1, 3, -1)).toBe(2);
    expect(advanceTagSuggestionIndex(0, 3, -1)).toBe(2);
  });
});
