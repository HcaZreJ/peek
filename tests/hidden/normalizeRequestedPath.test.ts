import { describe, it, expect } from 'vitest';
import { normalizeRequestedPath } from '../../src/shared/pathUtils';

describe('normalizeRequestedPath (hidden)', () => {

  // --- NUL byte error cases ---

  it('normalizeRequestedPath_nul_byte_in_absolute_throws', () => {
    // NUL in an otherwise-absolute path must still throw 'invalid path' (rule ① fires first)
    expect(() => normalizeRequestedPath('/foo\x00bar', '/Users/me')).toThrow('invalid path');
  });

  it('normalizeRequestedPath_nul_byte_in_tilde_path_throws', () => {
    // NUL in a ~/ path must throw 'invalid path' before tilde expansion
    expect(() => normalizeRequestedPath('~/fo\x00o', '/Users/me')).toThrow('invalid path');
  });

  it('normalizeRequestedPath_nul_byte_only_throws', () => {
    // A path that is just NUL must throw 'invalid path'
    expect(() => normalizeRequestedPath('\x00', '/Users/me')).toThrow('invalid path');
  });

  // --- Tilde expansion ---

  it('normalizeRequestedPath_bare_tilde_returns_home', () => {
    // '~' alone expands to home exactly
    expect(normalizeRequestedPath('~', '/Users/me')).toBe('/Users/me');
  });

  it('normalizeRequestedPath_tilde_slash_subpath', () => {
    // '~/x/y' expands to path.posix.join(home, 'x/y')
    expect(normalizeRequestedPath('~/x/y', '/Users/me')).toBe('/Users/me/x/y');
  });

  it('normalizeRequestedPath_tilde_slash_single_segment', () => {
    // '~/docs' expands to home + '/docs'
    expect(normalizeRequestedPath('~/docs', '/Users/me')).toBe('/Users/me/docs');
  });

  it('normalizeRequestedPath_home_with_unicode', () => {
    // Home directory containing non-ASCII (CJK) characters must be handled correctly
    expect(normalizeRequestedPath('~', '/Users/用户')).toBe('/Users/用户');
  });

  it('normalizeRequestedPath_tilde_subpath_home_with_unicode', () => {
    // Tilde expansion with a Unicode home directory
    expect(normalizeRequestedPath('~/文件', '/Users/用户')).toBe('/Users/用户/文件');
  });

  // --- posix.normalize on absolute paths ---

  it('normalizeRequestedPath_dot_dot_in_absolute_path', () => {
    // '/a/../b' must normalize to '/b'
    expect(normalizeRequestedPath('/a/../b', '/Users/me')).toBe('/b');
  });

  it('normalizeRequestedPath_dot_in_absolute_path', () => {
    // '/a/./b' must normalize to '/a/b'
    expect(normalizeRequestedPath('/a/./b', '/Users/me')).toBe('/a/b');
  });

  it('normalizeRequestedPath_multiple_dot_dot', () => {
    // Multiple '..' segments in an absolute path
    expect(normalizeRequestedPath('/a/b/c/../../d', '/Users/me')).toBe('/a/d');
  });

  it('normalizeRequestedPath_root_dot_dot_stays_root', () => {
    // '/..' normalizes to '/' (POSIX behaviour: can't go above root)
    expect(normalizeRequestedPath('/..', '/Users/me')).toBe('/');
  });

  it('normalizeRequestedPath_already_clean_absolute_path', () => {
    // A clean absolute path is returned as-is
    expect(normalizeRequestedPath('/var/log/app.log', '/Users/me')).toBe('/var/log/app.log');
  });

  // --- Relative path throws 'expected absolute path' ---

  it('normalizeRequestedPath_relative_path_throws', () => {
    // 'a/b' is not absolute after no expansion → must throw 'expected absolute path'
    expect(() => normalizeRequestedPath('a/b', '/Users/me')).toThrow('expected absolute path');
  });

  it('normalizeRequestedPath_bare_filename_throws', () => {
    // A plain filename with no leading '/' must throw 'expected absolute path'
    expect(() => normalizeRequestedPath('file.txt', '/Users/me')).toThrow('expected absolute path');
  });

  it('normalizeRequestedPath_dot_relative_throws', () => {
    // './relative' does not start with '/' after normalize → throws 'expected absolute path'
    expect(() => normalizeRequestedPath('./relative', '/Users/me')).toThrow('expected absolute path');
  });

});
