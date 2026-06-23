import { describe, expect, it } from 'vitest';
import { isExtensionUpdateAvailable } from './fetch-latest-extension-version';
import { semverGreater } from './semver';

describe('semverGreater', () => {
  it('compares numeric segments', () => {
    expect(semverGreater('6.0.0', '5.0.2')).toBe(true);
    expect(semverGreater('5.0.2', '6.0.0')).toBe(false);
    expect(semverGreater('6.0.0', '6.0.0')).toBe(false);
  });
});

describe('isExtensionUpdateAvailable', () => {
  it('returns true when latest is newer', () => {
    expect(isExtensionUpdateAvailable('5.0.2', '6.0.0')).toBe(true);
  });

  it('returns false when current is latest or newer', () => {
    expect(isExtensionUpdateAvailable('6.0.0', '6.0.0')).toBe(false);
    expect(isExtensionUpdateAvailable('6.0.1', '6.0.0')).toBe(false);
    expect(isExtensionUpdateAvailable('6.0.0', null)).toBe(false);
  });
});
