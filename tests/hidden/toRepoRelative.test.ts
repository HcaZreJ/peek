import { describe, it, expect } from 'vitest';
import { toRepoRelative } from '../../src/shared/pathUtils';

describe('toRepoRelative', () => {
  // --- happy path: absPath inside repoRoot ---

  it('toRepoRelative_single_level_inside_root', () => {
    // Direct child of repoRoot
    expect(toRepoRelative('/repo', '/repo/file.ts')).toBe('file.ts');
  });

  it('toRepoRelative_deep_nested_path', () => {
    // Several levels deep inside root
    expect(toRepoRelative('/a/b', '/a/b/c/d/e.ts')).toBe('c/d/e.ts');
  });

  it('toRepoRelative_uses_posix_separator', () => {
    // Result uses '/' not platform-specific separators
    const result = toRepoRelative('/proj/root', '/proj/root/sub/dir/file.js');
    expect(result).toBe('sub/dir/file.js');
    expect(result).not.toContain('\\');
  });

  it('toRepoRelative_no_leading_dot_slash', () => {
    // Result must NOT start with './'
    const result = toRepoRelative('/a/b', '/a/b/c.ts');
    expect(result.startsWith('./')).toBe(false);
  });

  // --- absPath === repoRoot ---

  it('toRepoRelative_equal_returns_basename_simple', () => {
    expect(toRepoRelative('/a/b', '/a/b')).toBe('b');
  });

  it('toRepoRelative_equal_returns_basename_single_segment', () => {
    // repoRoot is a top-level directory like '/repo'
    expect(toRepoRelative('/repo', '/repo')).toBe('repo');
  });

  // --- trailing slash on repoRoot ---

  it('toRepoRelative_root_trailing_slash_inside', () => {
    // repoRoot with trailing slash: '/a/b/' should behave same as '/a/b'
    expect(toRepoRelative('/a/b/', '/a/b/c/d.ts')).toBe('c/d.ts');
  });

  it('toRepoRelative_root_trailing_slash_equal', () => {
    // repoRoot='/a/b/', absPath='/a/b' (or '/a/b/') → basename 'b'
    expect(toRepoRelative('/a/b/', '/a/b')).toBe('b');
  });

  // --- outside root fallback ---

  it('toRepoRelative_outside_root_returns_original_absPath', () => {
    expect(toRepoRelative('/project', '/other/path/file.ts')).toBe('/other/path/file.ts');
  });

  it('toRepoRelative_prefix_match_not_inside_root', () => {
    // '/a/bc/file.ts' is NOT inside '/a/b' (prefix match must respect path boundaries)
    expect(toRepoRelative('/a/b', '/a/bc/file.ts')).toBe('/a/bc/file.ts');
  });

  // --- special characters in path segments ---

  it('toRepoRelative_path_with_spaces', () => {
    expect(toRepoRelative('/my project/root', '/my project/root/src/index.ts')).toBe('src/index.ts');
  });

  it('toRepoRelative_path_with_chinese_characters', () => {
    expect(toRepoRelative('/项目/根', '/项目/根/源码/文件.ts')).toBe('源码/文件.ts');
  });

  // --- repoRoot is filesystem root '/' ---

  it('toRepoRelative_repo_root_is_slash_returns_relative', () => {
    // repoRoot='/', absPath='/a/b.ts' → relative is 'a/b.ts'
    expect(toRepoRelative('/', '/a/b.ts')).toBe('a/b.ts');
  });

  // --- error cases: non-absolute paths ---

  it('toRepoRelative_relative_repoRoot_throws', () => {
    expect(() => toRepoRelative('relative/path', '/abs/path')).toThrow('expected absolute path');
  });

  it('toRepoRelative_relative_absPath_throws', () => {
    expect(() => toRepoRelative('/abs/root', 'relative/file.ts')).toThrow('expected absolute path');
  });

  it('toRepoRelative_both_relative_throws', () => {
    expect(() => toRepoRelative('a/b', 'c/d')).toThrow('expected absolute path');
  });

  it('toRepoRelative_empty_repoRoot_throws', () => {
    expect(() => toRepoRelative('', '/abs/path')).toThrow('expected absolute path');
  });

  it('toRepoRelative_empty_absPath_throws', () => {
    expect(() => toRepoRelative('/abs/root', '')).toThrow('expected absolute path');
  });
});
