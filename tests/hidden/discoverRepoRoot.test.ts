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

  // -----------------------------------------------------------------------
  // Nested VCS repo — the nearest one wins
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_nested_git_nearest_wins_over_farther_git', async () => {
    /**
     * .git exists both at sandbox/sub and at sandbox root (a nested repo
     * scenario). Starting from sandbox/sub/child, the nearest .git
     * (sandbox/sub) must win.
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
  // .hg and .svn are recognised while walking up
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_hg_found_walking_up', async () => {
    /**
     * No .git anywhere; a .hg directory exists two levels above startPath.
     * discoverRepoRoot must walk up and return that ancestor with marker '.hg'.
     */
    const deep = join(sandbox, 'a', 'b');
    await mkdir(deep, { recursive: true });
    await mkdir(join(sandbox, '.hg'));
    const result = await discoverRepoRoot(deep);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.hg');
  });

  it('discoverRepoRoot_svn_found_walking_up', async () => {
    /**
     * No .git or .hg anywhere; a .svn directory exists one level above
     * startPath. discoverRepoRoot must walk up and return that ancestor
     * with marker '.svn'.
     */
    const sub = join(sandbox, 'checkout');
    await mkdir(sub, { recursive: true });
    await mkdir(join(sandbox, '.svn'));
    const result = await discoverRepoRoot(sub);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.svn');
  });

  // -----------------------------------------------------------------------
  // Same-directory multi-marker priority
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_same_dir_git_wins_over_hg', async () => {
    /**
     * A single directory contains both .git and .hg. The priority order
     * defined by REPO_MARKERS ('.git' first) must decide the marker
     * reported for that directory.
     */
    await mkdir(join(sandbox, '.git'));
    await mkdir(join(sandbox, '.hg'));
    const result = await discoverRepoRoot(sandbox);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.git');
  });

  it('discoverRepoRoot_same_dir_hg_wins_over_svn', async () => {
    /**
     * A single directory contains both .hg and .svn (no .git). '.hg' has
     * higher priority and must be reported.
     */
    await mkdir(join(sandbox, '.hg'));
    await mkdir(join(sandbox, '.svn'));
    const result = await discoverRepoRoot(sandbox);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.hg');
  });

  // -----------------------------------------------------------------------
  // Weak markers (package.json / README.md / .claude) no longer pin the root
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_walks_past_package_json_to_find_git', async () => {
    /**
     * package.json sits closer to startPath than .git. Under the new
     * contract package.json is not a marker at all, so discoverRepoRoot
     * must walk straight past it and return the farther .git directory.
     *
     * Layout:
     *   sandbox/            <- has .git
     *     middle/           <- has package.json (closer, but not a marker)
     *       start/          <- startPath
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

  it('discoverRepoRoot_walks_past_readme_to_find_svn', async () => {
    /**
     * README.md sits closer to startPath than .svn. discoverRepoRoot must
     * not stop at the README.md directory and instead continue up to the
     * .svn directory.
     *
     * Layout:
     *   sandbox/            <- has .svn
     *     middle/           <- has README.md (closer, but not a marker)
     *       start/          <- startPath
     */
    const middle = join(sandbox, 'middle');
    const start = join(middle, 'start');
    await mkdir(start, { recursive: true });
    await mkdir(join(sandbox, '.svn'));
    await writeFile(join(middle, 'README.md'), '# readme');
    const result = await discoverRepoRoot(start);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.svn');
  });

  it('discoverRepoRoot_walks_past_claude_dir_to_find_git', async () => {
    /**
     * A .claude directory sits closer to startPath than .git. discoverRepoRoot
     * must not treat .claude as a marker and must continue up to .git.
     *
     * Layout:
     *   sandbox/            <- has .git
     *     middle/           <- has .claude/ (closer, but not a marker)
     *       start/          <- startPath
     */
    const middle = join(sandbox, 'middle');
    const start = join(middle, 'start');
    await mkdir(start, { recursive: true });
    await mkdir(join(sandbox, '.git'));
    await mkdir(join(middle, '.claude'));
    const result = await discoverRepoRoot(start);
    const expectedRoot = await realpath(sandbox);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBe('.git');
  });

  it('discoverRepoRoot_only_weak_markers_in_tree_returns_start_with_null', async () => {
    /**
     * The whole ancestor chain contains only weak (no-longer-recognised)
     * markers — package.json, README.md and .claude scattered across
     * several levels — and no VCS marker anywhere. discoverRepoRoot must
     * not pin the root at any of them; it must return the original start
     * directory with marker null.
     */
    await writeFile(join(sandbox, 'package.json'), '{}');
    const a = join(sandbox, 'a');
    await mkdir(a);
    await writeFile(join(a, 'README.md'), '# readme');
    const b = join(a, 'b');
    await mkdir(b);
    await mkdir(join(b, '.claude'));
    const start = join(b, 'start');
    await mkdir(start);
    const result = await discoverRepoRoot(start);
    const expectedRoot = await realpath(start);
    const actualRoot = await realpath(result.repoRoot);
    expect(actualRoot).toBe(expectedRoot);
    expect(result.marker).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Completely empty tree — marker null, returns start directory
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_no_markers_at_all_returns_start_with_null', async () => {
    /**
     * No markers anywhere. startPath is sandbox itself with no contents.
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
     * startPath is deep in the sandbox tree, but no markers exist
     * anywhere. The start directory (the deepest dir) must be returned,
     * not any intermediate ancestor, with a null marker.
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
  // startPath is a FILE — must use its containing directory as start
  // -----------------------------------------------------------------------

  it('discoverRepoRoot_file_as_startpath_uses_parent_dir', async () => {
    /**
     * When startPath points to a file, the function must treat the file's
     * parent directory as the starting point. Here .git is in that parent,
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

  it('discoverRepoRoot_file_in_subdir_with_no_markers_returns_subdir_with_null', async () => {
    /**
     * startPath is a file inside a subdirectory, and no VCS marker exists
     * anywhere in the tree (only a weak README.md at sandbox root). The
     * search must start at the file's parent directory and, finding
     * nothing all the way up, return that parent directory with marker
     * null.
     */
    const sub = join(sandbox, 'src');
    await mkdir(sub);
    await writeFile(join(sandbox, 'README.md'), '# readme');
    const filePath = join(sub, 'main.ts');
    await writeFile(filePath, '// code');
    const result = await discoverRepoRoot(filePath);
    const expectedRoot = await realpath(sub);
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
