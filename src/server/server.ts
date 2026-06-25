import { createServer, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, normalize, extname, sep } from 'node:path';
import { sendJson } from './http/respond';
import { parseQuery } from './http/parseQuery';
import { normalizeRequestedPath } from '../shared/pathUtils';
import { discoverRepoRoot } from './repoRoot';
import { listDir, readFileMeta, readFileChunk, sliceJsonlLines } from './fsApi';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** 把 fs/校验错误映射为 HTTP 状态码。 */
function errStatus(err: unknown): number {
  const code = (err as NodeJS.ErrnoException)?.code;
  if (code === 'ENOENT') return 404;
  if (code === 'EISDIR' || code === 'ENOTDIR') return 400;
  if (code === 'EACCES') return 403;
  return 500;
}

/** 单次文件块读取上限（防超大读取打爆内存）。 */
const MAX_CHUNK_BYTES = 16 * 1024 * 1024;
/** 单次 JSONL 行窗口上限。 */
const MAX_JSONL_COUNT = 5000;

/** 解析整数查询参数：非法→default；超界→clamp 到 [min, max]。 */
function intParam(raw: string | undefined, def: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** 解析并规范化请求中的 path 参数（展开 ~、规范化、要求绝对）。 */
function requirePath(params: Record<string, string>, home: string): string {
  const raw = params['path'];
  if (!raw) {
    const e = new Error('missing path param') as NodeJS.ErrnoException;
    e.code = 'EINVAL';
    throw e;
  }
  return normalizeRequestedPath(raw, home);
}

async function handleApi(
  pathname: string,
  params: Record<string, string>,
  res: ServerResponse,
  home: string,
): Promise<void> {
  switch (pathname) {
    case '/api/health':
      return sendJson(res, 200, { ok: true });
    case '/api/repo-root':
      return sendJson(res, 200, await discoverRepoRoot(requirePath(params, home)));
    case '/api/dir':
      return sendJson(res, 200, await listDir(requirePath(params, home)));
    case '/api/file/meta':
      return sendJson(res, 200, await readFileMeta(requirePath(params, home)));
    case '/api/file': {
      const offset = intParam(params['offset'], 0, 0, Number.MAX_SAFE_INTEGER);
      const limit = intParam(params['limit'], 1024 * 1024, 1, MAX_CHUNK_BYTES);
      return sendJson(res, 200, await readFileChunk(requirePath(params, home), offset, limit));
    }
    case '/api/jsonl': {
      const from = intParam(params['from'], 0, 0, Number.MAX_SAFE_INTEGER);
      const count = intParam(params['count'], 200, 1, MAX_JSONL_COUNT);
      return sendJson(res, 200, await sliceJsonlLines(requirePath(params, home), from, count));
    }
    default: {
      const e = new Error('not found') as NodeJS.ErrnoException;
      e.code = 'ENOENT';
      throw e;
    }
  }
}

/** 托管前端静态包；未命中的非资源路径回退到 index.html（SPA）。 */
async function serveStatic(distWebDir: string, pathname: string, res: ServerResponse): Promise<void> {
  const rel = pathname === '/' ? '/index.html' : pathname;
  // 防目录穿越：规范化后必须仍在 distWebDir 内。
  const target = normalize(join(distWebDir, rel));
  const fallback = join(distWebDir, 'index.html');
  // 边界检查需带分隔符，避免 distWebDir 的兄弟目录（如 web-extra）误通过。
  const withinRoot = target === distWebDir || target.startsWith(distWebDir + sep);
  const filePath = withinRoot ? target : fallback;
  let data: Buffer;
  try {
    data = await readFile(filePath);
  } catch {
    // SPA 回退：未知路径交给前端路由。
    data = await readFile(fallback);
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    res.end(data);
    return;
  }
  const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  res.end(data);
}

/** 组装 peek 本地服务（仅供 listen 到 127.0.0.1）。 */
export function createPeekServer(opts: { distWebDir: string }) {
  const home = homedir();
  return createServer((req, res) => {
    const { pathname, params } = parseQuery(req.url ?? '/');
    const work = pathname.startsWith('/api/')
      ? handleApi(pathname, params, res, home)
      : serveStatic(opts.distWebDir, pathname, res);
    work.catch((err: unknown) => {
      if (!res.headersSent) sendJson(res, errStatus(err), { error: String((err as Error)?.message ?? err) });
    });
  });
}
