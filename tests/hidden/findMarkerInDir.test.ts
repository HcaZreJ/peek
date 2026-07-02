import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findMarkerInDir, REPO_MARKERS } from '../../src/server/repoRoot';

describe('findMarkerInDir (hidden comprehensive)', () => {
  let sandbox: string;

  beforeEach(async () => {
    sandbox = await mkdtemp(join(tmpdir(), 'findMarkerInDir-hidden-'));
  });

  afterEach(async () => {
    await rm(sandbox, { recursive: true, force: true });
  });

  // -----------------------------------------------------------------------
  // Each of the three VCS markers hits on its own
  // -----------------------------------------------------------------------

  it('findMarkerInDir_git_directory_only_returns_git', async () => {
    /**
     * .git as a directory (the normal case for a cloned repo) must be
     * recognised and returned.
     */
    await mkdir(join(sandbox, '.git'));
    expect(await findMarkerInDir(sandbox)).toBe('.git');
  });

  it('findMarkerInDir_hg_directory_only_returns_hg', async () => {
    /**
     * .hg as a directory (Mercurial) must be recognised when it is the
     * only marker present.
     */
    await mkdir(join(sandbox, '.hg'));
    expect(await findMarkerInDir(sandbox)).toBe('.hg');
  });

  it('findMarkerInDir_svn_directory_only_returns_svn', async () => {
    /**
     * .svn as a directory (Subversion) must be recognised when it is the
     * only marker present.
     */
    await mkdir(join(sandbox, '.svn'));
    expect(await findMarkerInDir(sandbox)).toBe('.svn');
  });

  // -----------------------------------------------------------------------
  // Marker may be a file OR a directory
  // -----------------------------------------------------------------------

  it('findMarkerInDir_git_as_file_returns_git', async () => {
    /**
     * .git can also be a file (git worktrees use a .git file pointing at
     * the real gitdir). This must still be recognised as a marker.
     */
    await writeFile(join(sandbox, '.git'), 'gitdir: ../.git/worktrees/foo');
    expect(await findMarkerInDir(sandbox)).toBe('.git');
  });

  it('findMarkerInDir_hg_as_file_returns_hg', async () => {
    /**
     * Marker detection must not care whether the filesystem entry is a
     * file or a directory — only that the name exists.
     */
    await writeFile(join(sandbox, '.hg'), 'not a real hg store, just a file');
    expect(await findMarkerInDir(sandbox)).toBe('.hg');
  });

  // -----------------------------------------------------------------------
  // Weak markers no longer count under the shrunk table
  // -----------------------------------------------------------------------

  it('findMarkerInDir_all_weak_markers_present_returns_null', async () => {
    /**
     * package.json, README.md, .claude, go.mod, Cargo.toml, pyproject.toml
     * and pom.xml are no longer members of REPO_MARKERS. A directory that
     * contains all of them but no VCS marker must yield null.
     */
    await writeFile(join(sandbox, 'package.json'), '{}');
    await writeFile(join(sandbox, 'README.md'), '# project');
    await mkdir(join(sandbox, '.claude'));
    await writeFile(join(sandbox, 'go.mod'), 'module example.com/foo\n');
    await writeFile(join(sandbox, 'Cargo.toml'), '[package]\nname = "foo"\n');
    await writeFile(join(sandbox, 'pyproject.toml'), '[tool.poetry]\nname = "foo"\n');
    await writeFile(join(sandbox, 'pom.xml'), '<project/>');
    expect(await findMarkerInDir(sandbox)).toBeNull();
  });

  it('findMarkerInDir_weak_marker_ignored_when_vcs_marker_also_present', async () => {
    /**
     * When a weak (no longer recognised) marker coexists with a real VCS
     * marker, the VCS marker must still be the one returned.
     */
    await writeFile(join(sandbox, 'package.json'), '{}');
    await mkdir(join(sandbox, '.svn'));
    expect(await findMarkerInDir(sandbox)).toBe('.svn');
  });

  // -----------------------------------------------------------------------
  // Priority ordering among the three VCS markers
  // -----------------------------------------------------------------------

  it('findMarkerInDir_git_wins_over_hg_and_svn', async () => {
    /**
     * When all three VCS markers are present in the same directory, '.git'
     * has the highest priority and must be returned.
     */
    await mkdir(join(sandbox, '.git'));
    await mkdir(join(sandbox, '.hg'));
    await mkdir(join(sandbox, '.svn'));
    expect(await findMarkerInDir(sandbox)).toBe('.git');
  });

  it('findMarkerInDir_hg_wins_over_svn', async () => {
    /**
     * When .hg and .svn are both present (no .git), '.hg' has higher
     * priority and must be returned.
     */
    await mkdir(join(sandbox, '.hg'));
    await mkdir(join(sandbox, '.svn'));
    expect(await findMarkerInDir(sandbox)).toBe('.hg');
  });

  // -----------------------------------------------------------------------
  // Non-existent / empty directory
  // -----------------------------------------------------------------------

  it('findMarkerInDir_empty_dir_returns_null', async () => {
    /**
     * A directory with no marker entries must yield null.
     */
    expect(await findMarkerInDir(sandbox)).toBeNull();
  });

  it('findMarkerInDir_nonexistent_dir_returns_null', async () => {
    /**
     * A path that does not exist on disk must return null without
     * throwing.
     */
    const ghost = join(sandbox, 'does-not-exist');
    expect(await findMarkerInDir(ghost)).toBeNull();
  });

  // -----------------------------------------------------------------------
  // REPO_MARKERS contract
  // -----------------------------------------------------------------------

  it('findMarkerInDir_repo_markers_export_equals_new_contract', async () => {
    /**
     * REPO_MARKERS must be exactly ['.git', '.hg', '.svn'] in priority
     * order under the new contract.
     */
    expect(REPO_MARKERS).toEqual(['.git', '.hg', '.svn']);
  });

  it('findMarkerInDir_repo_markers_length_is_three', async () => {
    /**
     * The marker table must be shrunk to exactly three entries — no
     * project-file fallbacks remain.
     */
    expect(REPO_MARKERS.length).toBe(3);
  });
});
