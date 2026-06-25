import { describe, it, expect, afterEach } from 'vitest';
import { sliceJsonlLines } from '../../src/server/fsApi';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let sandbox: string;

async function makeSandbox(): Promise<string> {
  sandbox = await mkdtemp(join(tmpdir(), 'sliceJsonlLines-visible-'));
  return sandbox;
}

afterEach(async () => {
  if (sandbox) {
    await rm(sandbox, { recursive: true, force: true });
  }
});

describe('sliceJsonlLines (visible samples)', () => {
  it('sliceJsonlLines_basic_slice_no_trailing_newline', async () => {
    /**
     * File with 3 lines, no trailing newline.
     * from=0, count=2 returns the first two lines and total=3.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'a.jsonl');
    await writeFile(file, '{"a":1}\n{"b":2}\n{"c":3}');

    const result = await sliceJsonlLines(file, 0, 2);
    expect(result.from).toBe(0);
    expect(result.total).toBe(3);
    expect(result.lines).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('sliceJsonlLines_trailing_newline_does_not_add_extra_line', async () => {
    /**
     * File with 3 lines and a trailing newline must still report total=3,
     * not 4 — the trailing empty segment is not counted as a line.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'b.jsonl');
    await writeFile(file, '{"x":1}\n{"x":2}\n{"x":3}\n');

    const result = await sliceJsonlLines(file, 0, 10);
    expect(result.total).toBe(3);
    expect(result.lines).toHaveLength(3);
    expect(result.lines[2]).toBe('{"x":3}');
  });

  it('sliceJsonlLines_nonexistent_file_throws_with_code', async () => {
    /**
     * A path that does not exist must throw an Error with a `code` property
     * (e.g. ENOENT). The stub throws Error without `code`, so this fails on stub.
     */
    const err = await sliceJsonlLines(
      '/nonexistent-path-that-cannot-exist-xyz999/file.jsonl', 0, 5
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as NodeJS.ErrnoException).code).toMatch(/^E/);
  });
});
