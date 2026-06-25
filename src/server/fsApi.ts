import type { DirEntry, FileMeta, FileChunk, JsonlSlice } from '../shared/types';
import { readdir, stat, open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, extname } from 'node:path';
import { detectFileKind } from '../shared/fileKind';

/**
 * 列举目录。排序：目录在前、再按名称（locale 不敏感）升序。
 * 单项 stat 失败（如无权限）→ 跳过该项，不整体失败。
 * @throws Error 带 `code` 当 absDir 不存在或非目录
 */
export async function listDir(absDir: string): Promise<DirEntry[]> {
  const dirents = await readdir(absDir, { withFileTypes: true });
  const entries: DirEntry[] = [];

  for (const dirent of dirents) {
    const entryPath = join(absDir, dirent.name);
    let st;
    try {
      st = await stat(entryPath);
    } catch {
      continue;
    }
    const rawExt = extname(dirent.name);
    const ext = rawExt.startsWith('.') ? rawExt.slice(1).toLowerCase() : rawExt.toLowerCase();
    entries.push({
      name: dirent.name,
      path: entryPath,
      type: dirent.isDirectory() ? 'dir' : 'file',
      size: st.size,
      mtimeMs: st.mtimeMs,
      ext,
    });
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1;
    }
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });

  return entries;
}

/**
 * 读取文件元数据：size/mtimeMs/ext + 读头部 ≤8KB 作 sample 调 detectFileKind 定 kind。
 * @throws Error 带 `code` 当不存在或是目录
 */
export async function readFileMeta(absPath: string): Promise<FileMeta> {
  const st = await stat(absPath);
  if (st.isDirectory()) {
    const e = new Error('EISDIR') as NodeJS.ErrnoException;
    e.code = 'EISDIR';
    throw e;
  }
  const size = st.size;
  const mtimeMs = st.mtimeMs;
  const rawExt = extname(absPath);
  const ext = rawExt.startsWith('.') ? rawExt.slice(1).toLowerCase() : rawExt.toLowerCase();
  const chunk = await readFileChunk(absPath, 0, 8192);
  const kind = detectFileKind(ext, chunk.data);
  return { path: absPath, size, mtimeMs, ext, kind };
}

/**
 * 从 offset 读最多 limit 字节，utf8 解码，记录 bytesRead/eof。
 * @throws Error 当 offset<0 或 limit<=0；带 `code` 当文件不存在
 */
export async function readFileChunk(absPath: string, offset: number, limit: number): Promise<FileChunk> {
  if (offset < 0 || limit <= 0) {
    throw new Error('offset must be >= 0 and limit must be > 0');
  }

  const fh = await open(absPath, 'r');
  try {
    const fileStat = await fh.stat();
    const fileSize = fileStat.size;

    if (offset >= fileSize) {
      return { data: '', offset, bytesRead: 0, eof: true };
    }

    const buffer = Buffer.alloc(limit);
    const result = await fh.read(buffer, 0, limit, offset);
    const bytesRead = result.bytesRead;
    const data = buffer.toString('utf8', 0, bytesRead);
    const eof = (offset + bytesRead) >= fileSize;

    return { data, offset, bytesRead, eof };
  } finally {
    await fh.close();
  }
}

/**
 * 按行读取 `[from, from+count)` 区间的原始行字符串（不解析），并返回总行数 total。
 * 空行保留；尾部无换行的行计入。流式按行读，避免整文件入内存。
 * @throws Error 当 from<0 或 count<=0；带 `code` 当文件不存在
 */
export async function sliceJsonlLines(absPath: string, from: number, count: number): Promise<JsonlSlice> {
  if (from < 0 || count <= 0) {
    throw new Error('from must be >= 0 and count must be > 0');
  }

  // 流式按行读，避免整文件入内存：只保留 [from, from+count) 窗口 + 行计数。
  // readline 的行语义天然满足 spec：尾随 '\n' 不产生额外空行；中间空行保留；空文件 0 行。
  const stream = createReadStream(absPath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  const lines: string[] = [];
  let total = 0;
  try {
    for await (const line of rl) {
      if (total >= from && total < from + count) lines.push(line);
      total++;
    }
  } finally {
    rl.close();
    stream.destroy();
  }

  return { from, lines, total };
}
