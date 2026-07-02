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

  it('discoverRepoRoot_weak_marker_does_not_pin_root_returns_null', async () => {
    /**
     * Under the new contract, package.json is no longer a marker. A tree
     * that contains only package.json (no .git/.hg/.svn anywhere) must not
     * be pinned there — discoverRepoRoot walks past it and, finding
     * nothing, returns the start directory with marker null.
     */
    await writeFile(join(sandbox, 'package.json'), '{}');
    const deep = join(sandbox, 'sub', 'child');
    await mkdir(deep, { recursive: true });
    const result = await discoverRepoRoot(deep);
    const expectedRoot = await realpath(deep);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBeNull();
  });

  it('discoverRepoRoot_git_two_levels_up_walks_to_it', async () => {
    /**
     * startPath is two levels below the directory holding .git.
     * discoverRepoRoot must walk up and return that ancestor with marker '.git'.
     */
    const deep = join(sandbox, 'pkg', 'lib');
    await mkdir(deep, { recursive: true });
    await mkdir(join(sandbox, '.git'));
    const result = await discoverRepoRoot(deep);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.git');
  });
});
