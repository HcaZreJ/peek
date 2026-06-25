// peek 前端唯一的取数据出口。组件不直接 fetch，全部经此封装。
// 所有请求同源、只读，path 参数一律 encodeURIComponent。

import type {
  RepoRootInfo,
  DirEntry,
  FileMeta,
  FileChunk,
  JsonlSlice,
} from '../../../shared/types';

/** 接口返回非 2xx 时抛出，携带 HTTP 状态码与服务端错误消息。 */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** 统一发起 GET 请求并解析 JSON；非 2xx → ApiError。 */
async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: unknown };
      if (body && typeof body.error === 'string') message = body.error;
    } catch {
      // 响应体不是 JSON 时保留默认消息
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

/** 发现 absPath 所属的 repo root 与命中的 marker。 */
export function fetchRepoRoot(absPath: string): Promise<RepoRootInfo> {
  return getJson<RepoRootInfo>(`/api/repo-root?path=${encodeURIComponent(absPath)}`);
}

/** 列举目录（目录在前、文件在后，服务端已排序）。 */
export function fetchDir(absDir: string): Promise<DirEntry[]> {
  return getJson<DirEntry[]>(`/api/dir?path=${encodeURIComponent(absDir)}`);
}

/** 读取文件元数据；对目录服务端返回 4xx，抛 ApiError。 */
export function fetchFileMeta(absPath: string): Promise<FileMeta> {
  return getJson<FileMeta>(`/api/file/meta?path=${encodeURIComponent(absPath)}`);
}

/** 从 offset 起读取最多 limit 字节（utf8 解码）。 */
export function fetchFileChunk(
  absPath: string,
  offset: number,
  limit: number,
): Promise<FileChunk> {
  const qs = `path=${encodeURIComponent(absPath)}&offset=${offset}&limit=${limit}`;
  return getJson<FileChunk>(`/api/file?${qs}`);
}

/** 读取 JSONL 文件 [from, from+count) 区间的原始行。 */
export function fetchJsonl(
  absPath: string,
  from: number,
  count: number,
): Promise<JsonlSlice> {
  const qs = `path=${encodeURIComponent(absPath)}&from=${from}&count=${count}`;
  return getJson<JsonlSlice>(`/api/jsonl?${qs}`);
}
