import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveTarget } from '../../src/cli/resolveTarget';
import { mkdtemp, mkdir, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('resolveTarget', () => {
  let cwd: string;
  let home: string;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'peek-cwd-'));
    home = await mkdtemp(join(tmpdir(), 'peek-home-'));
    await writeFile(join(cwd, 'file.txt'), 'hello');
    await mkdir(join(cwd, 'sub'));
    await writeFile(join(home, 'h.txt'), 'home');
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  });

  it('resolveTarget_relative_existing_file_returns_absolute', async () => {
    // 'file.txt' relative to cwd should resolve to cwd/file.txt
    const result = await resolveTarget('file.txt', cwd, home);
    const expected = await realpath(join(cwd, 'file.txt'));
    expect(await realpath(result)).toBe(expected);
  });

  it('resolveTarget_tilde_home_file_resolves_to_home', async () => {
    // '~/h.txt' should expand ~ to home and resolve to home/h.txt
    const result = await resolveTarget('~/h.txt', cwd, home);
    const expected = await realpath(join(home, 'h.txt'));
    expect(await realpath(result)).toBe(expected);
  });

  it('resolveTarget_nonexistent_path_throws_enoent', async () => {
    // A path that does not exist must throw with code ENOENT
    await expect(resolveTarget('no-such-file.txt', cwd, home)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
