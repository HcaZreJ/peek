import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FileMeta } from '../../../shared/types';
import { useFileText, HIGHLIGHT_SIZE_LIMIT } from '../lib/useFileText';

interface TextViewProps {
  file: FileMeta;
}

const LINE_HEIGHT = 19;

/** 纯文本视图：等宽字体 + 行号 + 虚拟滚动。 */
export function TextView({ file }: TextViewProps) {
  const { text, truncated, loading, error } = useFileText(file.path, file.size);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => (text === null ? [] : text.split('\n')), [text]);
  const gutterWidth = useMemo(() => `${String(lines.length).length + 1}ch`, [lines.length]);

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => LINE_HEIGHT,
    overscan: 30,
  });

  if (error) return <div className="error-box">{error}</div>;
  if (loading || text === null) return <div className="loading-line">加载中…</div>;

  return (
    <div className="viewer-body text-view" ref={scrollRef}>
      {truncated && (
        <div className="viewer-note">
          大文件已截断（仅显示前 {Math.round(HIGHLIGHT_SIZE_LIMIT / (1024 * 1024))}MB）
        </div>
      )}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => (
          <div
            key={vItem.key}
            className="text-row"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: LINE_HEIGHT,
              transform: `translateY(${vItem.start}px)`,
            }}
          >
            <span className="gutter" style={{ minWidth: gutterWidth }}>
              {vItem.index + 1}
            </span>
            <span className="line">{lines[vItem.index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
