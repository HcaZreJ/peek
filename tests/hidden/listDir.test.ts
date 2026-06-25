import { describe, it, expect, afterEach } from 'vitest';
import { listDir } from '../../src/server/fsApi';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let sandbox: string;

async function makeSandbox(): Promise<string> {
  sandbox = await mkdtemp(join(tmpdir(), 'listDir-hidden-'));
  return sandbox;
}

afterEach(async () => {
  if (sandbox) {
    await rm(sandbox, { recursive: true, force: true });
  }
});

describe('listDir (hidden comprehensive)', () => {
  it('listDir_empty_directory_returns_empty_array', async () => {
    /**
     * An empty directory must return an empty array without throwing.
     */
    const dir = await makeSandbox();
    const result = await listDir(dir);
    expect(result).toEqual([]);
  });

  it('listDir_dirs_appear_before_files', async () => {
    /**
     * All directory entries must appear before all file entries regardless of name ordering.
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'aaa.txt'), '');
    await mkdir(join(dir, 'zzz'));

    const result = await listDir(dir);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('dir');
    expect(result[0].name).toBe('zzz');
    expect(result[1].type).toBe('file');
    expect(result[1].name).toBe('aaa.txt');
  });

  it('listDir_same_type_sorted_by_name_ascending', async () => {
    /**
     * Within each type group (dirs, then files), entries are sorted by name ascending.
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'Z.py'), 'z');
    await writeFile(join(dir, 'a.md'), 'a');
    await writeFile(join(dir, 'b.txt'), 'b');
    await mkdir(join(dir, 'sub'));
    await mkdir(join(dir, 'alpha'));

    const result = await listDir(dir);
    const dirNames = result.filter(e => e.type === 'dir').map(e => e.name);
    const fileNames = result.filter(e => e.type === 'file').map(e => e.name);
    expect(dirNames).toEqual([...dirNames].sort());
    expect(fileNames).toEqual([...fileNames].sort());
  });

  it('listDir_ext_standard_extension_lowercased', async () => {
    /**
     * ext must be the lowercased extension without the leading dot.
     * 'a.md' -> 'md', 'Z.PY' -> 'py', 'b.TXT' -> 'txt'.
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'a.md'), '');
    await writeFile(join(dir, 'Z.PY'), '');
    await writeFile(join(dir, 'b.TXT'), '');

    const result = await listDir(dir);
    const byName = Object.fromEntries(result.map(e => [e.name, e.ext]));
    expect(byName['a.md']).toBe('md');
    expect(byName['Z.PY']).toBe('py');
    expect(byName['b.TXT']).toBe('txt');
  });

  it('listDir_ext_no_extension_returns_empty_string', async () => {
    /**
     * A file with no extension must have ext = ''.
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'Makefile'), '');
    await writeFile(join(dir, 'README'), '');

    const result = await listDir(dir);
    for (const entry of result) {
      expect(entry.ext).toBe('');
    }
  });

  it('listDir_ext_double_extension_uses_last_segment', async () => {
    /**
     * For 'archive.tar.gz', ext must be 'gz' (only the last extension segment, no dot).
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'archive.tar.gz'), '');

    const result = await listDir(dir);
    expect(result).toHaveLength(1);
    expect(result[0].ext).toBe('gz');
  });

  it('listDir_hidden_files_included_in_results', async () => {
    /**
     * Files and directories starting with '.' must be included in results,
     * participating in the same sort ordering.
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, '.hidden-file'), '');
    await mkdir(join(dir, '.hidden-dir'));
    await writeFile(join(dir, 'visible.txt'), '');

    const result = await listDir(dir);
    const names = result.map(e => e.name);
    expect(names).toContain('.hidden-file');
    expect(names).toContain('.hidden-dir');
    expect(names).toContain('visible.txt');
    expect(result).toHaveLength(3);
  });

  it('listDir_path_field_is_absolute', async () => {
    /**
     * The `path` field of every entry must be an absolute path.
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'file.txt'), '');
    await mkdir(join(dir, 'subdir'));

    const result = await listDir(dir);
    for (const entry of result) {
      expect(entry.path.startsWith('/')).toBe(true);
    }
  });

  it('listDir_path_equals_dir_plus_name', async () => {
    /**
     * The `path` field must equal absDir + '/' + name for each entry.
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'file.txt'), 'content');
    await mkdir(join(dir, 'mydir'));

    const result = await listDir(dir);
    for (const entry of result) {
      expect(entry.path).toBe(join(dir, entry.name));
    }
  });

  it('listDir_type_dir_for_directories', async () => {
    /**
     * Subdirectories must have type = 'dir'.
     */
    const dir = await makeSandbox();
    await mkdir(join(dir, 'subdir'));

    const result = await listDir(dir);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('dir');
    expect(result[0].name).toBe('subdir');
  });

  it('listDir_type_file_for_regular_files', async () => {
    /**
     * Regular files must have type = 'file'.
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'hello.txt'), 'hi');

    const result = await listDir(dir);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('file');
    expect(result[0].name).toBe('hello.txt');
  });

  it('listDir_size_matches_written_bytes', async () => {
    /**
     * The `size` field must equal the number of bytes written to the file.
     */
    const dir = await makeSandbox();
    const content = 'hello world';
    const byteLen = Buffer.byteLength(content, 'utf8');
    await writeFile(join(dir, 'sized.txt'), content, 'utf8');

    const result = await listDir(dir);
    expect(result).toHaveLength(1);
    expect(result[0].size).toBe(byteLen);
  });

  it('listDir_mtimeMs_is_positive_number', async () => {
    /**
     * The `mtimeMs` field must be a positive number (from stat).
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'timed.txt'), 'data');

    const result = await listDir(dir);
    expect(result).toHaveLength(1);
    expect(result[0].mtimeMs).toBeGreaterThan(0);
    expect(typeof result[0].mtimeMs).toBe('number');
  });

  it('listDir_nonexistent_directory_throws_with_code', async () => {
    /**
     * When the path does not exist, an Error with a `code` property must be thrown.
     */
    await expect(
      listDir('/nonexistent-totally-fake-dir-xyz-987654')
    ).rejects.toMatchObject({
      code: expect.any(String),
    });
  });

  it('listDir_file_path_instead_of_dir_throws_with_code', async () => {
    /**
     * When a regular file path is passed instead of a directory, an Error
     * with a `code` property must be thrown.
     */
    const dir = await makeSandbox();
    const filePath = join(dir, 'notadir.txt');
    await writeFile(filePath, 'I am a file');

    await expect(listDir(filePath)).rejects.toMatchObject({
      code: expect.any(String),
    });
  });

  it('listDir_name_field_is_basename_only', async () => {
    /**
     * The `name` field must be the basename of the entry (not a full path, not a relative path with slashes).
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'justname.txt'), '');

    const result = await listDir(dir);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('justname.txt');
    expect(result[0].name).not.toContain('/');
  });

  it('listDir_mixed_hidden_and_visible_dirs_before_files', async () => {
    /**
     * Hidden directories must still sort before files, and all entries participate
     * in the same sort ordering rules (dirs first, files second; each group name-ascending).
     */
    const dir = await makeSandbox();
    await writeFile(join(dir, 'b.txt'), '');
    await mkdir(join(dir, '.hidden'));
    await writeFile(join(dir, '.dotfile'), '');
    await mkdir(join(dir, 'sub'));

    const result = await listDir(dir);
    const dirs = result.filter(e => e.type === 'dir');
    const files = result.filter(e => e.type === 'file');

    // All dirs before files
    const lastDirIdx = result.findLastIndex(e => e.type === 'dir');
    const firstFileIdx = result.findIndex(e => e.type === 'file');
    expect(lastDirIdx).toBeLessThan(firstFileIdx);

    // Dirs sorted ascending
    expect(dirs.map(e => e.name)).toEqual([...dirs.map(e => e.name)].sort());
    // Files sorted ascending
    expect(files.map(e => e.name)).toEqual([...files.map(e => e.name)].sort());

    // All entries present
    const allNames = result.map(e => e.name);
    expect(allNames).toContain('.hidden');
    expect(allNames).toContain('sub');
    expect(allNames).toContain('.dotfile');
    expect(allNames).toContain('b.txt');
  });
});
