import { describe, it, expect, afterEach } from 'vitest';
import { listDir } from '../../src/server/fsApi';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let sandbox: string;

async function makeSandbox(): Promise<string> {
  sandbox = await mkdtemp(join(tmpdir(), 'listDir-visible-'));
  return sandbox;
}

afterEach(async () => {
  if (sandbox) {
    await rm(sandbox, { recursive: true, force: true });
  }
});

describe('listDir (visible samples)', () => {
  it('listDir_empty_dir_returns_empty_array', async () => {
    /**
     * An empty directory must return an empty array (not throw).
     */
    const dir = await makeSandbox();
    const result = await listDir(dir);
    expect(result).toEqual([]);
  });

  it('listDir_dirs_before_files_in_mixed_directory', async () => {
    /**
     * Directories must appear before files in the result.
     * Within each group, entries are sorted by name ascending.
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'b.txt'), 'hello');
    await mkdir(join(dir, 'aaa'));
    await writeFile(join(dir, 'a.md'), 'world');
    await mkdir(join(dir, 'zzz'));

    const result = await listDir(dir);
    const types = result.map(e => e.type);
    const dirIndex = types.lastIndexOf('dir');
    const fileIndex = types.indexOf('file');
    // All dirs come before all files
    expect(dirIndex).toBeLessThan(fileIndex);
    // Dirs sorted by name
    const dirNames = result.filter(e => e.type === 'dir').map(e => e.name);
    expect(dirNames).toEqual(['aaa', 'zzz']);
    // Files sorted by name
    const fileNames = result.filter(e => e.type === 'file').map(e => e.name);
    expect(fileNames).toEqual(['a.md', 'b.txt']);
  });

  it('listDir_nonexistent_path_throws_with_code', async () => {
    /**
     * A path that does not exist must throw an Error with a `code` property.
     */
    await expect(listDir('/nonexistent-path-that-cannot-exist-abc123')).rejects.toMatchObject({
      code: expect.any(String),
    });
  });
});
