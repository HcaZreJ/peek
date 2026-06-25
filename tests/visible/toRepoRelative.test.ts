import { describe, it, expect } from 'vitest';
import { toRepoRelative } from '../../src/shared/pathUtils';

describe('toRepoRelative', () => {
  it('toRepoRelative_happy_path_nested_file', () => {
    // absPath inside repoRoot → POSIX relative segment, no leading './'
    expect(toRepoRelative('/a/b', '/a/b/c/d.ts')).toBe('c/d.ts');
  });

  it('toRepoRelative_equal_to_root_returns_basename', () => {
    // absPath === repoRoot → return basename of repoRoot
    expect(toRepoRelative('/a/b', '/a/b')).toBe('b');
  });

  it('toRepoRelative_outside_root_returns_absPath', () => {
    // absPath outside repoRoot → fallback: return absPath unchanged
    expect(toRepoRelative('/a/b', '/x/y')).toBe('/x/y');
  });
});
