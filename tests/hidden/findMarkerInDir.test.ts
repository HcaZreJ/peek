import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
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

  it('findMarkerInDir_git_file_only_returns_git', async () => {
    /**
     * .git as a file (e.g. a git worktree pointer) must be recognised and returned
     * as the highest-priority marker.
     */
    await writeFile(join(sandbox, '.git'), 'gitdir: ../.git');
    expect(await findMarkerInDir(sandbox)).toBe('.git');
  });

  it('findMarkerInDir_git_directory_returns_git', async () => {
    /**
     * .git as a directory (the normal case for a cloned repo) must also be recognised.
     * The spec states markers can be files OR directories.
     */
    await mkdir(join(sandbox, '.git'));
    expect(await findMarkerInDir(sandbox)).toBe('.git');
  });

  it('findMarkerInDir_package_json_only_returns_package_json', async () => {
    /**
     * When only package.json is present (no higher-priority markers), must return 'package.json'.
     */
    await writeFile(join(sandbox, 'package.json'), '{}');
    expect(await findMarkerInDir(sandbox)).toBe('package.json');
  });

  it('findMarkerInDir_readme_only_returns_readme', async () => {
    /**
     * README.md is the lowest-priority marker; when it is the only marker present
     * the function must still return it.
     */
    await writeFile(join(sandbox, 'README.md'), '# project');
    expect(await findMarkerInDir(sandbox)).toBe('README.md');
  });

  it('findMarkerInDir_claude_directory_returns_claude', async () => {
    /**
     * .claude as a directory must be recognised as a valid marker and returned
     * when no higher-priority marker is present.
     */
    await mkdir(join(sandbox, '.claude'));
    expect(await findMarkerInDir(sandbox)).toBe('.claude');
  });

  it('findMarkerInDir_git_wins_over_package_json', async () => {
    /**
     * When both .git and package.json are present, .git has higher priority
     * and must be returned.
     */
    await writeFile(join(sandbox, '.git'), 'gitdir: ../.git');
    await writeFile(join(sandbox, 'package.json'), '{}');
    expect(await findMarkerInDir(sandbox)).toBe('.git');
  });

  it('findMarkerInDir_package_json_wins_over_readme', async () => {
    /**
     * package.json has higher priority than README.md;
     * when both are present, 'package.json' must be returned.
     */
    await writeFile(join(sandbox, 'package.json'), '{}');
    await writeFile(join(sandbox, 'README.md'), '# project');
    expect(await findMarkerInDir(sandbox)).toBe('package.json');
  });

  it('findMarkerInDir_empty_dir_returns_null', async () => {
    /**
     * A directory with no marker files must yield null.
     */
    expect(await findMarkerInDir(sandbox)).toBeNull();
  });

  it('findMarkerInDir_nonexistent_dir_returns_null', async () => {
    /**
     * A path that does not exist on disk must return null without throwing.
     */
    const ghost = join(sandbox, 'does-not-exist');
    expect(await findMarkerInDir(ghost)).toBeNull();
  });

  it('findMarkerInDir_go_mod_only_returns_go_mod', async () => {
    /**
     * go.mod must be recognised as a valid marker when it is the only one present.
     */
    await writeFile(join(sandbox, 'go.mod'), 'module example.com/foo\n\ngo 1.21\n');
    expect(await findMarkerInDir(sandbox)).toBe('go.mod');
  });

  it('findMarkerInDir_cargo_toml_only_returns_cargo_toml', async () => {
    /**
     * Cargo.toml must be recognised as a valid marker when it is the only one present.
     */
    await writeFile(join(sandbox, 'Cargo.toml'), '[package]\nname = "foo"\n');
    expect(await findMarkerInDir(sandbox)).toBe('Cargo.toml');
  });

  it('findMarkerInDir_pyproject_toml_only_returns_pyproject_toml', async () => {
    /**
     * pyproject.toml must be recognised as a valid marker when it is the only one present.
     */
    await writeFile(join(sandbox, 'pyproject.toml'), '[tool.poetry]\nname = "foo"\n');
    expect(await findMarkerInDir(sandbox)).toBe('pyproject.toml');
  });

  it('findMarkerInDir_hg_wins_over_svn', async () => {
    /**
     * .hg has higher priority than .svn; when both are present, '.hg' must be returned.
     */
    await mkdir(join(sandbox, '.hg'));
    await mkdir(join(sandbox, '.svn'));
    expect(await findMarkerInDir(sandbox)).toBe('.hg');
  });

  it('findMarkerInDir_svn_only_returns_svn', async () => {
    /**
     * .svn as a directory must be recognised when no higher-priority marker is present.
     */
    await mkdir(join(sandbox, '.svn'));
    expect(await findMarkerInDir(sandbox)).toBe('.svn');
  });

  it('findMarkerInDir_pom_xml_only_returns_pom_xml', async () => {
    /**
     * pom.xml must be recognised as a valid marker when it is the only one present.
     */
    await writeFile(join(sandbox, 'pom.xml'), '<project/>');
    expect(await findMarkerInDir(sandbox)).toBe('pom.xml');
  });

  it('findMarkerInDir_repo_markers_export_correct_order', async () => {
    /**
     * REPO_MARKERS must be exported and must list markers in priority order:
     * .git first, README.md last.
     */
    expect(Array.isArray(REPO_MARKERS)).toBe(true);
    expect(REPO_MARKERS[0]).toBe('.git');
    expect(REPO_MARKERS[REPO_MARKERS.length - 1]).toBe('README.md');
  });
});
