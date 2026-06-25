import { useEffect, useState } from 'react';
import { fetchFileChunk } from './api';

export const HIGHLIGHT_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

export interface FileTextState {
  text: string | null;
  truncated: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * 读取文件文本内容（最多 limit 字节）。size 超过 limit 时标记 truncated。
 * path 变化时重新加载，组件卸载/路径切换时丢弃过期结果。
 */
export function useFileText(
  path: string,
  size: number,
  limit = HIGHLIGHT_SIZE_LIMIT,
): FileTextState {
  const [state, setState] = useState<FileTextState>({
    text: null,
    truncated: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ text: null, truncated: false, loading: true, error: null });
    const readLimit = Math.min(size > 0 ? size : limit, limit);
    fetchFileChunk(path, 0, Math.max(readLimit, 1))
      .then((chunk) => {
        if (cancelled) return;
        setState({
          text: chunk.data,
          truncated: !chunk.eof || size > limit,
          loading: false,
          error: null,
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          text: null,
          truncated: false,
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [path, size, limit]);

  return state;
}
