import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FileMeta } from '../../../shared/types';
import { fetchJsonl } from '../lib/api';
import { parseJsonSafe, collectColumns, summarizeRecord } from '../../../shared/jsonView';
import { JsonlRecord } from './JsonlRecord';
import type { TreeCmd } from './JsonNode';

interface JsonlViewProps {
  file: FileMeta;
}

type Mode = 'stream' | 'table';

const PAGE = 200;

type Parsed = { ok: true; value: unknown } | { ok: false; error: string };

interface LoadedLine {
  raw: string;
  parsed: Parsed;
}

/** 把后端原始行解析为带解析结果的记录。 */
function toLoaded(raw: string): LoadedLine {
  if (raw.trim() === '') {
    return { raw, parsed: { ok: false, error: 'empty line' } };
  }
  const p = parseJsonSafe(raw);
  return { raw, parsed: p.ok ? { ok: true, value: p.value } : { ok: false, error: p.error } };
}

/** JSONL 视图：记录流 / 表格 切换，分页 + 虚拟滚动 + 滚到底自动加载。 */
export function JsonlView({ file }: JsonlViewProps) {
  const [mode, setMode] = useState<Mode>('stream');
  const [lines, setLines] = useState<LoadedLine[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cmd, setCmd] = useState<TreeCmd | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadedCount = lines.length;
  const hasMore = total === null || loadedCount < total;

  const loadNext = useCallback(async () => {
    if (loadingRef.current) return;
    if (total !== null && loadedCount >= total) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const slice = await fetchJsonl(file.path, loadedCount, PAGE);
      setTotal(slice.total);
      setLines((prev) => [...prev, ...slice.lines.map(toLoaded)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [file.path, loadedCount, total]);

  // 切换文件 → 重置并加载首页。
  useEffect(() => {
    setLines([]);
    setTotal(null);
    setError(null);
    setCmd(null);
    loadingRef.current = false;
  }, [file.path]);

  // 首页加载（lines 清空且尚未拿到 total 时）。
  useEffect(() => {
    if (lines.length === 0 && total === null && !loadingRef.current && !error) {
      void loadNext();
    }
  }, [lines.length, total, error, loadNext]);

  return (
    <div className="viewer">
      <div className="viewer-toolbar">
        <div className="seg">
          <button className={mode === 'stream' ? 'active' : ''} onClick={() => setMode('stream')}>
            记录流
          </button>
          <button className={mode === 'table' ? 'active' : ''} onClick={() => setMode('table')}>
            表格
          </button>
        </div>
        {mode === 'stream' && (
          <div className="seg">
            <button onClick={() => setCmd((c) => ({ seq: (c?.seq ?? 0) + 1, open: true }))}>
              全展开
            </button>
            <button onClick={() => setCmd((c) => ({ seq: (c?.seq ?? 0) + 1, open: false }))}>
              全折叠
            </button>
          </div>
        )}
        <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>
          {total === null ? '…' : `${loadedCount} / ${total} 行`}
        </span>
      </div>
      {error && <div className="error-box">{error}</div>}
      {mode === 'stream' ? (
        <StreamView
          lines={lines}
          scrollRef={scrollRef}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={loadNext}
          cmd={cmd}
        />
      ) : (
        <TableView
          lines={lines}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={loadNext}
        />
      )}
    </div>
  );
}

interface SubViewProps {
  lines: LoadedLine[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

const ROW_HEIGHT = 24;

function StreamView({
  lines,
  scrollRef,
  hasMore,
  loading,
  onLoadMore,
  cmd,
}: SubViewProps & { scrollRef: React.RefObject<HTMLDivElement | null>; cmd: TreeCmd | null }) {
  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  // 滚到底自动加载下一页。
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
      onLoadMore();
    }
  };

  const items = virtualizer.getVirtualItems();

  return (
    <div className="jsonl-stream" ref={scrollRef} onScroll={onScroll}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {items.map((vItem) => {
          const ln = lines[vItem.index];
          return (
            <div
              key={vItem.key}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vItem.start}px)`,
              }}
            >
              <JsonlRecord lineNo={vItem.index + 1} raw={ln.raw} parsed={ln.parsed} cmd={cmd} />
            </div>
          );
        })}
      </div>
      {hasMore && (
        <div className="jsonl-status">
          {loading ? '加载中…' : <button onClick={onLoadMore}>加载更多</button>}
        </div>
      )}
    </div>
  );
}

function TableView({ lines, hasMore, loading, onLoadMore }: SubViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const records = useMemo(
    () => lines.map((l) => (l.parsed.ok ? l.parsed.value : undefined)),
    [lines],
  );
  const columns = useMemo(() => collectColumns(records), [records]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
      onLoadMore();
    }
  };

  const cellText = (rec: unknown, col: string): string => {
    if (typeof rec !== 'object' || rec === null || Array.isArray(rec)) return '';
    const v = (rec as Record<string, unknown>)[col];
    if (v === undefined) return '';
    if (v === null) return 'null';
    if (typeof v === 'object') return summarizeRecord(v, 80);
    return String(v);
  };

  return (
    <div className="jsonl-table-wrap" ref={scrollRef} onScroll={onScroll}>
      <table className="jsonl-table">
        <thead className="jsonl-thead">
          <tr>
            <th className="jsonl-th idx">#</th>
            {columns.map((c) => (
              <th key={c} className="jsonl-th">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="jsonl-td idx">{i + 1}</td>
              {columns.map((c) => (
                <td key={c} className="jsonl-td" title={cellText(l.parsed.ok ? l.parsed.value : undefined, c)}>
                  {l.parsed.ok ? cellText(l.parsed.value, c) : '⚠'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <div className="jsonl-status">
          {loading ? '加载中…' : <button onClick={onLoadMore}>加载更多</button>}
        </div>
      )}
    </div>
  );
}
