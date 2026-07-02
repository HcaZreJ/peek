import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findMarkerInDir } from '../../src/server/repoRoot';

describe('findMarkerInDir (visible samples)', () => {
  let sandbox: string;

  beforeEach(async () => {
    sandbox = await mkdtemp(join(tmpdir(), 'findMarkerInDir-visible-'));
  });

  afterEach(async () => {
    await rm(sandbox, { recursive: true, force: true });
  });

  it('findMarkerInDir_git_directory_returns_git', async () => {
    /**
     * When a .git directory exists in the directory, findMarkerInDir must
     * return '.git' — it is a VCS marker under the new contract.
     */
    await mkdir(join(sandbox, '.git'));
    const result = await findMarkerInDir(sandbox);
    expect(result).toBe('.git');
  });

  it('findMarkerInDir_weak_marker_no_longer_matches', async () => {
    /**
     * Under the new contract REPO_MARKERS is only ['.git', '.hg', '.svn'].
     * package.json is no longer a recognised marker, so a directory that
     * contains only package.json must yield null.
     */
    await writeFile(join(sandbox, 'package.json'), '{}');
    const result = await findMarkerInDir(sandbox);
    expect(result).toBeNull();
  });

  it('findMarkerInDir_empty_dir_returns_null', async () => {
    /**
     * When the directory contains no marker entries at all, findMarkerInDir
     * must return null.
     */
    const result = await findMarkerInDir(sandbox);
    expect(result).toBeNull();
  });
});
