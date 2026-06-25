import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileChunk } from '../../src/server/fsApi';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// Sandbox fixture: creates a temp dir, plus helper to create files inside it.
let sandboxDir: string;
let testFile: string;       // 10-byte ASCII file: 'abcdefghij'
let emptyFile: string;      // 0-byte file

beforeEach(async () => {
  sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'peek-readFileChunk-hidden-'));
  testFile = path.join(sandboxDir, 'sample.txt');
  emptyFile = path.join(sandboxDir, 'empty.txt');
  await fs.writeFile(testFile, 'abcdefghij', 'utf8');  // exactly 10 bytes
  await fs.writeFile(emptyFile, '', 'utf8');             // 0 bytes
});

afterEach(async () => {
  await fs.rm(sandboxDir, { recursive: true, force: true });
});

describe('readFileChunk (hidden comprehensive)', () => {

  // --- Happy-path: full read ---

  it('readFileChunk_offset0_limit_equals_filesize_returns_all_and_eof', async () => {
    /**
     * offset=0, limit=10 → reads all 10 bytes, bytesRead=10, eof=true.
     */
    const chunk = await readFileChunk(testFile, 0, 10);
    expect(chunk.data).toBe('abcdefghij');
    expect(chunk.offset).toBe(0);
    expect(chunk.bytesRead).toBe(10);
    expect(chunk.eof).toBe(true);
  });

  // --- Happy-path: partial reads ---

  it('readFileChunk_offset0_limit3_returns_first_three_bytes_eof_false', async () => {
    /**
     * offset=0, limit=3 → 'abc', bytesRead=3, eof=false (7 bytes remain).
     */
    const chunk = await readFileChunk(testFile, 0, 3);
    expect(chunk.data).toBe('abc');
    expect(chunk.offset).toBe(0);
    expect(chunk.bytesRead).toBe(3);
    expect(chunk.eof).toBe(false);
  });

  it('readFileChunk_middle_offset_reads_correct_slice', async () => {
    /**
     * offset=5, limit=3 → 'fgh', bytesRead=3, eof=false (2 bytes remain).
     */
    const chunk = await readFileChunk(testFile, 5, 3);
    expect(chunk.data).toBe('fgh');
    expect(chunk.offset).toBe(5);
    expect(chunk.bytesRead).toBe(3);
    expect(chunk.eof).toBe(false);
  });

  it('readFileChunk_limit_exceeds_remaining_reads_to_end_eof_true', async () => {
    /**
     * offset=7, limit=100 → only 3 bytes remain ('hij'), bytesRead=3, eof=true.
     */
    const chunk = await readFileChunk(testFile, 7, 100);
    expect(chunk.data).toBe('hij');
    expect(chunk.offset).toBe(7);
    expect(chunk.bytesRead).toBe(3);
    expect(chunk.eof).toBe(true);
  });

  it('readFileChunk_read_exactly_to_last_byte_eof_true', async () => {
    /**
     * offset=9, limit=1 → reads the single last byte 'j', bytesRead=1, eof=true.
     */
    const chunk = await readFileChunk(testFile, 9, 1);
    expect(chunk.data).toBe('j');
    expect(chunk.offset).toBe(9);
    expect(chunk.bytesRead).toBe(1);
    expect(chunk.eof).toBe(true);
  });

  // --- Boundary: offset equals file size ---

  it('readFileChunk_offset_equals_filesize_returns_empty_eof_true', async () => {
    /**
     * offset=10 (exactly filesize), any positive limit → data='', bytesRead=0, eof=true.
     */
    const chunk = await readFileChunk(testFile, 10, 5);
    expect(chunk.data).toBe('');
    expect(chunk.offset).toBe(10);
    expect(chunk.bytesRead).toBe(0);
    expect(chunk.eof).toBe(true);
  });

  // --- Boundary: offset beyond file size ---

  it('readFileChunk_offset_beyond_filesize_returns_empty_eof_true', async () => {
    /**
     * offset=999 >> filesize → data='', bytesRead=0, eof=true.
     */
    const chunk = await readFileChunk(testFile, 999, 5);
    expect(chunk.data).toBe('');
    expect(chunk.offset).toBe(999);
    expect(chunk.bytesRead).toBe(0);
    expect(chunk.eof).toBe(true);
  });

  // --- Empty file ---

  it('readFileChunk_empty_file_offset0_returns_empty_eof_true', async () => {
    /**
     * Reading from a 0-byte file at offset=0 must return data='', bytesRead=0, eof=true.
     */
    const chunk = await readFileChunk(emptyFile, 0, 10);
    expect(chunk.data).toBe('');
    expect(chunk.offset).toBe(0);
    expect(chunk.bytesRead).toBe(0);
    expect(chunk.eof).toBe(true);
  });

  // --- Large limit reads whole file ---

  it('readFileChunk_large_limit_from_start_reads_entire_file', async () => {
    /**
     * offset=0, limit=99999 → reads all 10 bytes, eof=true.
     */
    const chunk = await readFileChunk(testFile, 0, 99999);
    expect(chunk.data).toBe('abcdefghij');
    expect(chunk.bytesRead).toBe(10);
    expect(chunk.eof).toBe(true);
  });

  // --- offset field echoed back ---

  it('readFileChunk_returned_offset_matches_input_offset', async () => {
    /**
     * The returned offset field must always equal the offset that was passed in.
     */
    const chunk = await readFileChunk(testFile, 3, 4);
    expect(chunk.offset).toBe(3);
  });

  // --- Error cases: invalid arguments ---

  it('readFileChunk_negative_offset_throws', async () => {
    /**
     * offset < 0 must throw an Error.
     */
    await expect(readFileChunk(testFile, -1, 5)).rejects.toThrow(Error);
  });

  it('readFileChunk_offset_negative_large_throws', async () => {
    /**
     * Any negative offset, not just -1, must throw an Error.
     */
    await expect(readFileChunk(testFile, -100, 5)).rejects.toThrow(Error);
  });

  it('readFileChunk_limit_zero_throws', async () => {
    /**
     * limit=0 must throw an Error.
     */
    await expect(readFileChunk(testFile, 0, 0)).rejects.toThrow(Error);
  });

  it('readFileChunk_limit_negative_throws', async () => {
    /**
     * limit < 0 must throw an Error.
     */
    await expect(readFileChunk(testFile, 0, -1)).rejects.toThrow(Error);
  });

  it('readFileChunk_limit_negative_large_throws', async () => {
    /**
     * Any negative limit must throw an Error.
     */
    await expect(readFileChunk(testFile, 0, -50)).rejects.toThrow(Error);
  });

  // --- Error case: file does not exist ---

  it('readFileChunk_nonexistent_file_throws_with_code', async () => {
    /**
     * Passing a path to a file that does not exist must reject with an Error
     * that carries a `code` property (e.g. 'ENOENT').
     */
    const missing = path.join(sandboxDir, 'does-not-exist.txt');
    await expect(readFileChunk(missing, 0, 10)).rejects.toMatchObject({
      code: expect.any(String),
    });
  });

  // --- Consecutive reads simulate streaming ---

  it('readFileChunk_consecutive_reads_cover_full_file', async () => {
    /**
     * Reading in two back-to-back windows of 5 bytes each must reconstruct
     * the full 10-byte file contents.
     */
    const first = await readFileChunk(testFile, 0, 5);
    const second = await readFileChunk(testFile, 5, 5);
    expect(first.data + second.data).toBe('abcdefghij');
    expect(first.eof).toBe(false);
    expect(second.eof).toBe(true);
  });

});
