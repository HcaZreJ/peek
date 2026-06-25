import { describe, it, expect } from 'vitest';
import { normalizeRequestedPath } from '../../src/shared/pathUtils';

describe('normalizeRequestedPath', () => {
  it('normalizeRequestedPath_happy_absolute_path', () => {
    // An already-absolute path is returned normalized
    expect(normalizeRequestedPath('/home/user/docs', '/home/user')).toBe('/home/user/docs');
  });

  it('normalizeRequestedPath_tilde_expands_to_home', () => {
    // Bare '~' expands to the home directory exactly
    expect(normalizeRequestedPath('~', '/Users/me')).toBe('/Users/me');
  });

  it('normalizeRequestedPath_nul_byte_throws_invalid_path', () => {
    // A path containing a NUL byte must throw Error('invalid path')
    expect(() => normalizeRequestedPath('/foo\x00bar', '/Users/me')).toThrow('invalid path');
  });
});
