import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverRepoRoot } from '../../src/server/repoRoot';

describe('discoverRepoRoot (visible samples)', () => {
  let sandbox: string;

  beforeEach(async () => {
    sandbox = await mkdtemp(join(tmpdir(), 'discoverRepoRoot-visible-'));
    sandbox = await realpath(sandbox);
  });

  afterEach(async () => {
    await rm(sandbox, { recursive: true, force: true });
  });

  it('discoverRepoRoot_git_at_start_returns_start_with_git_marker', async () => {
    /**
     * When the startPath directory itself contains a .git entry,
     * discoverRepoRoot must return that directory as repoRoot with marker '.git'.
     */
    await mkdir(join(sandbox, '.git'));
    const result = await discoverRepoRoot(sandbox);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.git');
  });

  it('discoverRepoRoot_no_markers_anywhere_returns_start_with_null_marker', async () => {
    /**
     * When no markers exist anywhere in the ancestor chain,
     * discoverRepoRoot must return the start directory with marker null.
     * We place startPath in a subdirectory with no markers to ensure no
     * ancestor markers are found within the sandbox.
     */
    const deep = join(sandbox, 'a', 'b', 'c');
    await mkdir(deep, { recursive: true });
    const result = await discoverRepoRoot(deep);
    const expectedRoot = await realpath(deep);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBeNull();
  });

  it('discoverRepoRoot_package_json_fallback_returned_when_no_git', async () => {
    /**
     * When a package.json exists in an ancestor but no .git exists anywhere,
     * discoverRepoRoot must return that ancestor directory with marker 'package.json'.
     * We place package.json at sandbox root and startPath two levels deep,
     * with no .git anywhere.
     */
    await writeFile(join(sandbox, 'package.json'), '{}');
    const deep = join(sandbox, 'sub', 'child');
    await mkdir(deep, { recursive: true });
    const result = await discoverRepoRoot(deep);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('package.json');
  });
});
