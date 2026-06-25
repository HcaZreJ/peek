import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
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

  it('findMarkerInDir_git_file_returns_git', async () => {
    /**
     * When a .git file exists in the directory, findMarkerInDir must return '.git'
     * because .git is the highest-priority marker.
     */
    await writeFile(join(sandbox, '.git'), 'gitdir: ../.git');
    const result = await findMarkerInDir(sandbox);
    expect(result).toBe('.git');
  });

  it('findMarkerInDir_package_json_only_returns_package_json', async () => {
    /**
     * When only package.json exists (no higher-priority markers present),
     * findMarkerInDir must return 'package.json'.
     */
    await writeFile(join(sandbox, 'package.json'), '{}');
    const result = await findMarkerInDir(sandbox);
    expect(result).toBe('package.json');
  });

  it('findMarkerInDir_empty_dir_returns_null', async () => {
    /**
     * When the directory contains no marker files, findMarkerInDir must return null.
     */
    const result = await findMarkerInDir(sandbox);
    expect(result).toBeNull();
  });
});
