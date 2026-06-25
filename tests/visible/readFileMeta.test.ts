import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileMeta } from '../../src/server/fsApi';

describe('readFileMeta (visible samples)', () => {
  let sandbox: string;

  beforeEach(async () => {
    sandbox = await mkdtemp(join(tmpdir(), 'readFileMeta-visible-'));
  });

  afterEach(async () => {
    await rm(sandbox, { recursive: true, force: true });
  });

  it('readFileMeta_python_file_returns_code_kind', async () => {
    /**
     * A .py file containing Python source code must be classified as kind='code'.
     * The returned path must equal the absolute path passed in, ext must be 'py'
     * (lowercase, no dot), and size must match the byte length of the content.
     */
    const content = 'def hello():\n    return "world"\n';
    const filePath = join(sandbox, 'a.py');
    await writeFile(filePath, content, 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.path).toBe(filePath);
    expect(meta.ext).toBe('py');
    expect(meta.kind).toBe('code');
    expect(meta.size).toBe(Buffer.byteLength(content, 'utf8'));
    expect(typeof meta.mtimeMs).toBe('number');
    expect(meta.mtimeMs).toBeGreaterThan(0);
  });

  it('readFileMeta_markdown_file_returns_markdown_kind', async () => {
    /**
     * A .md file must be classified as kind='markdown' and ext='md'.
     */
    const content = '# Hello World\n\nThis is markdown.\n';
    const filePath = join(sandbox, 'b.md');
    await writeFile(filePath, content, 'utf8');
    const meta = await readFileMeta(filePath);
    expect(meta.path).toBe(filePath);
    expect(meta.ext).toBe('md');
    expect(meta.kind).toBe('markdown');
    expect(meta.size).toBe(Buffer.byteLength(content, 'utf8'));
  });

  it('readFileMeta_nonexistent_path_throws_with_code', async () => {
    /**
     * Passing a path that does not exist must reject with an Error that has a
     * truthy `code` property (e.g. 'ENOENT'), matching the spec error_case.
     */
    const ghost = join(sandbox, 'does-not-exist.ts');
    await expect(readFileMeta(ghost)).rejects.toMatchObject({ code: expect.any(String) });
  });
});
