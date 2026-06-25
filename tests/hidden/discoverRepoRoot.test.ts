import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverRepoRoot } from '../../src/server/repoRoot';

describe('discoverRepoRoot (hidden comprehensive)', () => {
  let sandbox: string;

  beforeEach(async () => {
    sandbox = await mkdtemp(join(tmpdir(), 'discoverRepoRoot-hidden-'));
    sandbox = await realpath(sandbox);
  });

  afterEach(async () => {
    await rm(sandbox, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // startPath is a FILE — must use its containing directory as start
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_file_as_startpath_uses_parent_dir', async () => {
    /**
     * When startPath points to a file, the function must treat the file's
     * parent directory as the starting point.  Here .git is in that parent,
     * so it should be returned immediately.
     */
    await mkdir(join(sandbox, '.git'));
    const filePath = join(sandbox, 'README.md');
    await writeFile(filePath, '# test');
    const result = await discoverRepoRoot(filePath);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.git');
  });

  it('discoverRepoRoot_file_in_subdir_uses_subdir_as_start', async () => {
    /**
     * startPath is a file inside a subdirectory.  .git is at sandbox root.
     * The search begins at the subdirectory, finds nothing there, then walks
     * up one level to sandbox where .git lives.
     */
    const sub = join(sandbox, 'src');
    await mkdir(sub);
    await mkdir(join(sandbox, '.git'));
    const filePath = join(sub, 'main.ts');
    await writeFile(filePath, '// code');
    const result = await discoverRepoRoot(filePath);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.git');
  });

  // -----------------------------------------------------------------------
  // .git at the start directory itself
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_git_dir_at_start_immediate_return', async () => {
    /**
     * .git directory at the exact start level — must return immediately
     * with marker '.git', not walk further.
     */
    await mkdir(join(sandbox, '.git'));
    const result = await discoverRepoRoot(sandbox);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.git');
  });

  it('discoverRepoRoot_git_file_at_start_counts_as_git_marker', async () => {
    /**
     * .git can also be a file (worktrees).  A .git file at start level
     * must still produce marker '.git'.
     */
    await writeFile(join(sandbox, '.git'), 'gitdir: ../.git/worktrees/foo');
    const result = await discoverRepoRoot(sandbox);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.git');
  });

  // -----------------------------------------------------------------------
  // .git two levels up
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_git_two_levels_up_walks_to_it', async () => {
    /**
     * startPath is two levels below sandbox root where .git lives.
     * The function must walk up two levels and return sandbox root with '.git'.
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

  // -----------------------------------------------------------------------
  // Nearest .git wins (two .git entries at different depths)
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_nearest_git_wins_over_farther_git', async () => {
    /**
     * .git exists both at sandbox/sub and at sandbox root.
     * Starting from sandbox/sub/child, the nearest .git (sandbox/sub) must win.
     */
    const sub = join(sandbox, 'sub');
    const child = join(sub, 'child');
    await mkdir(child, { recursive: true });
    await mkdir(join(sandbox, '.git'));    // farther
    await mkdir(join(sub, '.git'));        // nearer
    const result = await discoverRepoRoot(child);
    const expectedRoot = await realpath(sub);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.git');
  });

  // -----------------------------------------------------------------------
  // .git globally wins over package.json that is closer
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_git_wins_over_nearer_package_json', async () => {
    /**
     * package.json is closer to startPath than .git, but the spec says
     * .git has unconditional priority — it must be returned regardless of
     * how far up the tree it lives.
     *
     * Layout:
     *   sandbox/            ← has .git
     *     middle/           ← has package.json  (closer to start)
     *       start/          ← startPath
     */
    const middle = join(sandbox, 'middle');
    const start = join(middle, 'start');
    await mkdir(start, { recursive: true });
    await mkdir(join(sandbox, '.git'));
    await writeFile(join(middle, 'package.json'), '{}');
    const result = await discoverRepoRoot(start);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.git');
  });

  // -----------------------------------------------------------------------
  // Fallback markers: package.json, README.md, .claude
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_no_git_package_json_fallback_returned', async () => {
    /**
     * No .git anywhere in the tree.  package.json at sandbox root.
     * startPath is a deep subdirectory.  Must return sandbox root with
     * marker 'package.json'.
     */
    await writeFile(join(sandbox, 'package.json'), '{}');
    const deep = join(sandbox, 'a', 'b');
    await mkdir(deep, { recursive: true });
    const result = await discoverRepoRoot(deep);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('package.json');
  });

  it('discoverRepoRoot_no_git_readme_fallback_returned', async () => {
    /**
     * No .git anywhere.  README.md at sandbox root.  startPath is one
     * level below.  Must return sandbox root with marker 'README.md'.
     */
    await writeFile(join(sandbox, 'README.md'), '# readme');
    const sub = join(sandbox, 'src');
    await mkdir(sub);
    const result = await discoverRepoRoot(sub);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('README.md');
  });

  it('discoverRepoRoot_no_git_claude_fallback_returned', async () => {
    /**
     * No .git anywhere.  .claude directory at sandbox root.  startPath is
     * one level below.  Must return sandbox root with marker '.claude'.
     */
    await mkdir(join(sandbox, '.claude'));
    const sub = join(sandbox, 'project');
    await mkdir(sub);
    const result = await discoverRepoRoot(sub);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.claude');
  });

  // -----------------------------------------------------------------------
  // Nearest fallback is recorded (only the first one encountered)
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_nearest_fallback_wins_when_multiple_markers_no_git', async () => {
    /**
     * No .git anywhere.  package.json at sandbox/sub (closer to start)
     * AND README.md at sandbox root (farther).  The nearest marker
     * (package.json) must be the fallback returned.
     *
     * Layout:
     *   sandbox/            ← has README.md
     *     sub/              ← has package.json
     *       start/          ← startPath
     */
    const sub = join(sandbox, 'sub');
    const start = join(sub, 'start');
    await mkdir(start, { recursive: true });
    await writeFile(join(sandbox, 'README.md'), '# readme');
    await writeFile(join(sub, 'package.json'), '{}');
    const result = await discoverRepoRoot(start);
    const expectedRoot = await realpath(sub);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('package.json');
  });

  // -----------------------------------------------------------------------
  // Completely empty tree — marker null, returns start directory
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_no_markers_at_all_returns_start_with_null', async () => {
    /**
     * No markers anywhere.  startPath is sandbox itself with no contents.
     * Must return startPath (sandbox) with marker null.
     */
    const result = await discoverRepoRoot(sandbox);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBeNull();
  });

  it('discoverRepoRoot_deep_path_no_markers_returns_start_dir_with_null', async () => {
    /**
     * startPath is deep in the sandbox tree, but no markers exist anywhere.
     * The start directory (the deepest dir) must be returned with null marker.
     */
    const deep = join(sandbox, 'x', 'y', 'z');
    await mkdir(deep, { recursive: true });
    const result = await discoverRepoRoot(deep);
    const expectedRoot = await realpath(deep);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Error case: startPath does not exist → ENOENT
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_nonexistent_path_throws_enoent', async () => {
    /**
     * When startPath does not exist on the filesystem, discoverRepoRoot must
     * throw an Error whose .code property is 'ENOENT'.
     */
    const missing = join(sandbox, 'does-not-exist');
    await expect(discoverRepoRoot(missing)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('discoverRepoRoot_nonexistent_nested_path_throws_enoent', async () => {
    /**
     * A deeply nested non-existent path must also throw ENOENT, not silently
     * fall through to some default behaviour.
     */
    const missing = join(sandbox, 'a', 'b', 'c', 'nope');
    await expect(discoverRepoRoot(missing)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
