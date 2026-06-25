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
    await writeFile(join(home, 'h.txt'), 'home content');
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  });

  it('resolveTarget_dot_resolves_to_cwd', async () => {
    // target='.' should resolve to cwd itself
    const result = await resolveTarget('.', cwd, home);
    const expected = await realpath(cwd);
    expect(await realpath(result)).toBe(expected);
  });

  it('resolveTarget_relative_file_resolves_to_cwd_file', async () => {
    // 'file.txt' should resolve relative to cwd → cwd/file.txt
    const result = await resolveTarget('file.txt', cwd, home);
    const expected = await realpath(join(cwd, 'file.txt'));
    expect(await realpath(result)).toBe(expected);
  });

  it('resolveTarget_dot_slash_file_resolves_to_cwd_file', async () => {
    // './file.txt' is a relative path and should resolve to cwd/file.txt
    const result = await resolveTarget('./file.txt', cwd, home);
    const expected = await realpath(join(cwd, 'file.txt'));
    expect(await realpath(result)).toBe(expected);
  });

  it('resolveTarget_relative_directory_resolves_to_cwd_subdir', async () => {
    // 'sub' is a relative path to an existing directory under cwd
    const result = await resolveTarget('sub', cwd, home);
    const expected = await realpath(join(cwd, 'sub'));
    expect(await realpath(result)).toBe(expected);
  });

  it('resolveTarget_absolute_path_to_existing_file_returned_as_is', async () => {
    // An absolute path pointing to an existing file should be returned (normalised)
    const abs = join(cwd, 'file.txt');
    const result = await resolveTarget(abs, cwd, home);
    const expected = await realpath(abs);
    expect(await realpath(result)).toBe(expected);
  });

  it('resolveTarget_tilde_alone_resolves_to_home', async () => {
    // target='~' should expand to home directory itself
    const result = await resolveTarget('~', cwd, home);
    const expected = await realpath(home);
    expect(await realpath(result)).toBe(expected);
  });

  it('resolveTarget_tilde_slash_file_resolves_to_home_file', async () => {
    // '~/h.txt' should expand ~ to home → home/h.txt
    const result = await resolveTarget('~/h.txt', cwd, home);
    const expected = await realpath(join(home, 'h.txt'));
    expect(await realpath(result)).toBe(expected);
  });

  it('resolveTarget_returns_string', async () => {
    // The return value must be a string (the absolute path)
    const result = await resolveTarget('file.txt', cwd, home);
    expect(typeof result).toBe('string');
  });

  it('resolveTarget_result_is_absolute_path', async () => {
    // The returned path must be absolute (starts with '/')
    const result = await resolveTarget('file.txt', cwd, home);
    expect(result.startsWith('/')).toBe(true);
  });

  it('resolveTarget_normalizes_dot_dot_in_relative_path', async () => {
    // 'sub/../file.txt' should normalise to cwd/file.txt
    const result = await resolveTarget('sub/../file.txt', cwd, home);
    const expected = await realpath(join(cwd, 'file.txt'));
    expect(await realpath(result)).toBe(expected);
  });

  it('resolveTarget_nonexistent_relative_path_throws_enoent', async () => {
    // A relative path that does not exist must throw an Error with code ENOENT
    await expect(resolveTarget('ghost.txt', cwd, home)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('resolveTarget_nonexistent_absolute_path_throws_enoent', async () => {
    // An absolute path that does not exist must throw an Error with code ENOENT
    const abs = join(cwd, 'does-not-exist.txt');
    await expect(resolveTarget(abs, cwd, home)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('resolveTarget_nonexistent_tilde_path_throws_enoent', async () => {
    // '~/nope' expands to home/nope which does not exist → ENOENT
    await expect(resolveTarget('~/nope', cwd, home)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
