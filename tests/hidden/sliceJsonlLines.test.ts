import { describe, it, expect, afterEach } from 'vitest';
import { sliceJsonlLines } from '../../src/server/fsApi';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let sandbox: string;

async function makeSandbox(): Promise<string> {
  sandbox = await mkdtemp(join(tmpdir(), 'sliceJsonlLines-hidden-'));
  return sandbox;
}

afterEach(async () => {
  if (sandbox) {
    await rm(sandbox, { recursive: true, force: true });
  }
});

describe('sliceJsonlLines (hidden comprehensive)', () => {
  it('sliceJsonlLines_from0_count2_returns_first_two_lines', async () => {
    /**
     * from=0 count=2: must return exactly the first two raw lines.
     * Lines must not include the '\n' terminator.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, 'line0\nline1\nline2\nline3');

    const result = await sliceJsonlLines(file, 0, 2);
    expect(result.from).toBe(0);
    expect(result.lines).toEqual(['line0', 'line1']);
    expect(result.total).toBe(4);
  });

  it('sliceJsonlLines_mid_slice_returns_correct_window', async () => {
    /**
     * from=1 count=2 must return lines at index 1 and 2 (not 0 or 3).
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, 'alpha\nbeta\ngamma\ndelta');

    const result = await sliceJsonlLines(file, 1, 2);
    expect(result.from).toBe(1);
    expect(result.lines).toEqual(['beta', 'gamma']);
    expect(result.total).toBe(4);
  });

  it('sliceJsonlLines_count_exceeds_remaining_lines_clips_to_end', async () => {
    /**
     * When from+count > total, result contains only the lines that exist
     * from `from` to the end — fewer than count.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, 'one\ntwo\nthree');

    const result = await sliceJsonlLines(file, 2, 100);
    expect(result.from).toBe(2);
    expect(result.lines).toEqual(['three']);
    expect(result.total).toBe(3);
  });

  it('sliceJsonlLines_total_correct_without_trailing_newline', async () => {
    /**
     * File without trailing newline: total equals the number of '\n'-separated
     * segments (all non-empty here).
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, 'a\nb\nc');

    const result = await sliceJsonlLines(file, 0, 99);
    expect(result.total).toBe(3);
    expect(result.lines).toHaveLength(3);
  });

  it('sliceJsonlLines_total_correct_with_trailing_newline', async () => {
    /**
     * File with trailing newline: the final empty segment after the last '\n'
     * must NOT be counted. total must still equal 3 for 'a\nb\nc\n'.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, 'a\nb\nc\n');

    const result = await sliceJsonlLines(file, 0, 99);
    expect(result.total).toBe(3);
    expect(result.lines).toHaveLength(3);
    expect(result.lines).toEqual(['a', 'b', 'c']);
  });

  it('sliceJsonlLines_intermediate_blank_lines_preserved', async () => {
    /**
     * An intermediate blank line (consecutive '\n\n') must appear as '' in the
     * returned lines array and count toward total.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    // 3 lines: 'a', '', 'c'
    await writeFile(file, 'a\n\nc');

    const result = await sliceJsonlLines(file, 0, 99);
    expect(result.total).toBe(3);
    expect(result.lines).toEqual(['a', '', 'c']);
  });

  it('sliceJsonlLines_malformed_json_line_returned_as_raw_string', async () => {
    /**
     * The function must NOT parse JSON. A syntactically invalid JSON line must
     * be returned verbatim without throwing.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, '{"valid":true}\nnot-valid-json{\n{"also":true}');

    const result = await sliceJsonlLines(file, 0, 99);
    expect(result.total).toBe(3);
    expect(result.lines[1]).toBe('not-valid-json{');
  });

  it('sliceJsonlLines_from_exceeds_total_returns_empty_lines', async () => {
    /**
     * When from >= total, lines must be [] but total still reflects the real
     * line count of the file.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, 'one\ntwo\nthree');

    const result = await sliceJsonlLines(file, 10, 5);
    expect(result.from).toBe(10);
    expect(result.lines).toEqual([]);
    expect(result.total).toBe(3);
  });

  it('sliceJsonlLines_empty_file_total_zero_lines_empty', async () => {
    /**
     * An empty file has no lines: total=0 and lines=[].
     */
    const dir = await makeSandbox();
    const file = join(dir, 'empty.jsonl');
    await writeFile(file, '');

    const result = await sliceJsonlLines(file, 0, 10);
    expect(result.total).toBe(0);
    expect(result.lines).toEqual([]);
  });

  it('sliceJsonlLines_negative_from_throws_error', async () => {
    /**
     * from < 0 must throw an Error whose message does NOT equal 'NotImplemented'
     * (i.e. the real implementation enforces the precondition with its own message).
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, 'a\nb');

    const err = await sliceJsonlLines(file, -1, 2).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toBe('NotImplemented');
  });

  it('sliceJsonlLines_zero_count_throws_error', async () => {
    /**
     * count=0 must throw an Error whose message does NOT equal 'NotImplemented'.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, 'a\nb');

    const err = await sliceJsonlLines(file, 0, 0).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toBe('NotImplemented');
  });

  it('sliceJsonlLines_negative_count_throws_error', async () => {
    /**
     * count < 0 must throw an Error whose message does NOT equal 'NotImplemented'.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, 'a\nb');

    const err = await sliceJsonlLines(file, 0, -5).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).not.toBe('NotImplemented');
  });

  it('sliceJsonlLines_nonexistent_file_throws_with_code_property', async () => {
    /**
     * A missing file must throw an Error whose `code` property is set
     * (typically 'ENOENT'). The stub throws without a `code` property, so this
     * fails on the stub.
     */
    const err = await sliceJsonlLines(
      '/definitely/does/not/exist/file.jsonl', 0, 1
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as NodeJS.ErrnoException).code).toMatch(/^E/);
  });

  it('sliceJsonlLines_returned_from_field_equals_input_from', async () => {
    /**
     * The `from` field in the returned JsonlSlice must exactly equal the `from`
     * argument passed in, regardless of the actual content.
     */
    const dir = await makeSandbox();
    const file = join(dir, 'data.jsonl');
    await writeFile(file, 'x\ny\nz\nw');

    const result = await sliceJsonlLines(file, 2, 5);
    expect(result.from).toBe(2);
  });

  it('sliceJsonlLines_single_line_no_newline', async () => {
    /**
     * A file with a single line and no newline: total=1, lines=['content'].
     */
    const dir = await makeSandbox();
    const file = join(dir, 'single.jsonl');
    await writeFile(file, '{"only":true}');

    const result = await sliceJsonlLines(file, 0, 10);
    expect(result.total).toBe(1);
    expect(result.lines).toEqual(['{"only":true}']);
  });

  it('sliceJsonlLines_single_line_with_trailing_newline', async () => {
    /**
     * A file with a single line followed by a trailing newline: total=1
     * (trailing empty segment not counted), lines=['content'].
     */
    const dir = await makeSandbox();
    const file = join(dir, 'single.jsonl');
    await writeFile(file, '{"only":true}\n');

    const result = await sliceJsonlLines(file, 0, 10);
    expect(result.total).toBe(1);
    expect(result.lines).toEqual(['{"only":true}']);
  });
});
