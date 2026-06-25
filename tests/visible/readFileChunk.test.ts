import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileChunk } from '../../src/server/fsApi';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

// Sandbox fixture: creates a temp dir with a known 10-byte ASCII file.
let sandboxDir: string;
let testFile: string;

beforeEach(async () => {
  sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'peek-readFileChunk-'));
  testFile = path.join(sandboxDir, 'sample.txt');
  // 10 bytes: 'abcdefghij'
  await fs.writeFile(testFile, 'abcdefghij', 'utf8');
});

afterEach(async () => {
  await fs.rm(sandboxDir, { recursive: true, force: true });
});

describe('readFileChunk (visible samples)', () => {

  it('readFileChunk_reads_from_start', async () => {
    /**
     * Reading from offset=0 with limit=3 should return the first 3 bytes,
     * bytesRead=3, and eof=false because there are bytes remaining.
     */
    const chunk = await readFileChunk(testFile, 0, 3);
    expect(chunk.data).toBe('abc');
    expect(chunk.offset).toBe(0);
    expect(chunk.bytesRead).toBe(3);
    expect(chunk.eof).toBe(false);
  });

  it('readFileChunk_reads_whole_file', async () => {
    /**
     * Reading from offset=0 with limit=10 (exactly the file size) should
     * return all 10 bytes and eof=true because we reached the end.
     */
    const chunk = await readFileChunk(testFile, 0, 10);
    expect(chunk.data).toBe('abcdefghij');
    expect(chunk.offset).toBe(0);
    expect(chunk.bytesRead).toBe(10);
    expect(chunk.eof).toBe(true);
  });

  it('readFileChunk_offset_beyond_file_size', async () => {
    /**
     * When offset exceeds the file size, data must be empty, bytesRead=0,
     * and eof=true.
     */
    const chunk = await readFileChunk(testFile, 100, 5);
    expect(chunk.data).toBe('');
    expect(chunk.offset).toBe(100);
    expect(chunk.bytesRead).toBe(0);
    expect(chunk.eof).toBe(true);
  });

});
