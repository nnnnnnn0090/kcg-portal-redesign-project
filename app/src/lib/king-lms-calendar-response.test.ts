import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  isCalendarItemsLoaded,
  normalizeCalendarItemsResponse,
} from './king-lms-calendar-response';

describe('king-lms-calendar-response', () => {
  const capturePath = new URL('./__fixtures__/calendar-items.json', import.meta.url);

  it('loads calendarItems fixture from capture', () => {
    expect(fs.existsSync(capturePath)).toBe(true);
    const row = JSON.parse(fs.readFileSync(capturePath, 'utf8')) as { raw: unknown };
    expect(isCalendarItemsLoaded(row.raw)).toBe(true);
    const items = normalizeCalendarItemsResponse(row.raw);
    expect(items).not.toBeNull();
    expect(items!.length).toBe(28);
  });

  it('returns null for invalid payload', () => {
    expect(normalizeCalendarItemsResponse(null)).toBeNull();
    expect(normalizeCalendarItemsResponse({})).toBeNull();
  });

  it('accepts bare array', () => {
    expect(normalizeCalendarItemsResponse([{ title: 'x' }])).toEqual([{ title: 'x' }]);
  });
});
