import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileMeta } from '../../src/server/fsApi';

describe('readFileMeta (hidden comprehensive)', () => {
  let sandbox: string;

  beforeEach(async () => {
    sandbox = await mkdtemp(join(tmpdir(), 'readFileMeta-hidden-'));
  });

  afterEach(async () => {
    await rm(sandbox, { recursive: true, force: true });
  });

  // --- kind classification ---

  it('readFileMeta_py_file_kind_is_code', async () => {
    /**
     * .py extension maps to kind='code' per the detectFileKind contract.
     */
    const content = 'print("hello")\n';
    const filePath = join(sandbox, 'a.py');
    await writeFile(filePath, content, 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.kind).toBe('code');
  });

  it('readFileMeta_ts_file_kind_is_code', async () => {
    /**
     * .ts extension (TypeScript) maps to kind='code'.
     */
    const content = 'export const x = 1;\n';
    const filePath = join(sandbox, 'module.ts');
    await writeFile(filePath, content, 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.kind).toBe('code');
  });

  it('readFileMeta_md_file_kind_is_markdown', async () => {
    /**
     * .md extension maps to kind='markdown'.
     */
    const content = '# Title\n\nBody text.\n';
    const filePath = join(sandbox, 'b.md');
    await writeFile(filePath, content, 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.kind).toBe('markdown');
  });

  it('readFileMeta_json_file_kind_is_json', async () => {
    /**
     * .json extension maps to kind='json'.
     */
    const content = '{"x":1}\n';
    const filePath = join(sandbox, 'c.json');
    await writeFile(filePath, content, 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.kind).toBe('json');
  });

  it('readFileMeta_jsonl_file_kind_is_jsonl', async () => {
    /**
     * .jsonl extension maps to kind='jsonl'.
     */
    const content = '{"a":1}\n{"b":2}\n';
    const filePath = join(sandbox, 'd.jsonl');
    await writeFile(filePath, content, 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.kind).toBe('jsonl');
  });

  it('readFileMeta_txt_file_kind_is_text', async () => {
    /**
     * .txt extension with no NUL bytes maps to kind='text'.
     */
    const content = 'Hello, plain text.\n';
    const filePath = join(sandbox, 'e.txt');
    await writeFile(filePath, content, 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.kind).toBe('text');
  });

  it('readFileMeta_binary_file_with_nul_kind_is_binary', async () => {
    /**
     * A file with an unknown extension (.dat) that contains a NUL byte in its
     * first ≤8 KB must be classified as kind='binary'.
     */
    const bytes = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    const filePath = join(sandbox, 'f.dat');
    await writeFile(filePath, bytes);
    const meta = await readFileMeta(filePath);
    expect(meta.kind).toBe('binary');
  });

  // --- ext field ---

  it('readFileMeta_ext_is_lowercase_no_dot', async () => {
    /**
     * The ext field must be the extension in lowercase without a leading dot.
     * For 'c.json', ext must be 'json' not '.json' or 'JSON'.
     */
    const filePath = join(sandbox, 'c.json');
    await writeFile(filePath, '{}', 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.ext).toBe('json');
    expect(meta.ext).not.toContain('.');
  });

  it('readFileMeta_ext_uppercase_source_is_normalized_to_lowercase', async () => {
    /**
     * Even if the file has a mixed-case extension like .PY or .Ts,
     * ext must be returned in lowercase.
     */
    const filePath = join(sandbox, 'SCRIPT.PY');
    await writeFile(filePath, 'x = 1\n', 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.ext).toBe('py');
  });

  // --- size field ---

  it('readFileMeta_size_matches_byte_length', async () => {
    /**
     * size must equal the exact byte count of the file as returned by stat,
     * not the character count (relevant for multibyte UTF-8 content).
     */
    const content = '# 日本語\n';
    const filePath = join(sandbox, 'unicode.md');
    await writeFile(filePath, content, 'utf8');
    const expectedBytes = Buffer.byteLength(content, 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.size).toBe(expectedBytes);
  });

  it('readFileMeta_size_is_zero_for_empty_file', async () => {
    /**
     * An empty file must have size=0.
     */
    const filePath = join(sandbox, 'empty.txt');
    await writeFile(filePath, '', 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.size).toBe(0);
  });

  // --- path field ---

  it('readFileMeta_path_field_equals_input_absPath', async () => {
    /**
     * The path field in the returned FileMeta must equal the absPath argument
     * passed to readFileMeta.
     */
    const filePath = join(sandbox, 'check.ts');
    await writeFile(filePath, 'const x = 1;\n', 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.path).toBe(filePath);
  });

  // --- mtimeMs field ---

  it('readFileMeta_mtimeMs_is_positive_number', async () => {
    /**
     * mtimeMs must be a positive number representing the modification time
     * in milliseconds (sourced from stat).
     */
    const filePath = join(sandbox, 'ts.ts');
    await writeFile(filePath, 'export {};\n', 'utf8');
    const meta = await readFileMeta(filePath);
    expect(typeof meta.mtimeMs).toBe('number');
    expect(meta.mtimeMs).toBeGreaterThan(0);
  });

  // --- error cases ---

  it('readFileMeta_nonexistent_file_throws_with_code', async () => {
    /**
     * A path that does not exist must reject with an Error carrying a truthy
     * `code` property (e.g. 'ENOENT').
     */
    const ghost = join(sandbox, 'no-such-file.ts');
    await expect(readFileMeta(ghost)).rejects.toMatchObject({ code: expect.any(String) });
  });

  it('readFileMeta_directory_path_throws_with_code', async () => {
    /**
     * Passing a directory path instead of a file path must reject with an
     * Error carrying a truthy `code` property (spec: directories are not
     * valid inputs).
     */
    const dir = join(sandbox, 'subdir');
    await mkdir(dir);
    await expect(readFileMeta(dir)).rejects.toMatchObject({ code: expect.any(String) });
  });
});
