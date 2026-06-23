import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  isStreamsUltraLoaded,
  isStreamsUltraLoadingPlaceholder,
} from './streams-ultra-response';

describe('streams-ultra-response', () => {
  it('detects captured loading placeholder', () => {
    const captureDir = path.join(process.cwd(), '.streams-ultra-capture');
    const file = path.join(captureDir, 'response-1.json');
    if (!fs.existsSync(file)) return;
    const row = JSON.parse(fs.readFileSync(file, 'utf8')) as { raw: unknown };
    expect(isStreamsUltraLoadingPlaceholder(row.raw)).toBe(true);
    expect(isStreamsUltraLoaded(row.raw)).toBe(false);
  });

  it('detects captured loaded responses', () => {
    const captureDir = path.join(process.cwd(), '.streams-ultra-capture');
    for (const name of ['response-0.json', 'response-2.json']) {
      const file = path.join(captureDir, name);
      if (!fs.existsSync(file)) return;
      const row = JSON.parse(fs.readFileSync(file, 'utf8')) as { raw: unknown };
      expect(isStreamsUltraLoadingPlaceholder(row.raw)).toBe(false);
      expect(isStreamsUltraLoaded(row.raw)).toBe(true);
    }
  });

  it('treats sv_moreData=true with empty entries as placeholder', () => {
    expect(isStreamsUltraLoadingPlaceholder({
      sv_streamEntries: [],
      sv_moreData: true,
      sv_providers: [{}],
      sv_extras: { sx_courses: [] },
    })).toBe(true);
  });

  it('treats loaded empty stream as loaded (not placeholder)', () => {
    const loadedEmpty = {
      sv_streamEntries: [],
      sv_moreData: false,
      sv_providers: Array.from({ length: 10 }, () => ({})),
      sv_extras: { sx_courses: [{ id: '1', name: 'Course' }] },
    };
    expect(isStreamsUltraLoadingPlaceholder(loadedEmpty)).toBe(false);
    expect(isStreamsUltraLoaded(loadedEmpty)).toBe(true);
  });
});
