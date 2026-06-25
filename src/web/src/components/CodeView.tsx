import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FileMeta } from '../../../shared/types';
import { useFileText, HIGHLIGHT_SIZE_LIMIT } from '../lib/useFileText';
import { highlightToLines, langForExt, type ThemedToken } from '../lib/highlight';

interface CodeViewProps {
  file: FileMeta;
}

const LINE_HEIGHT = 19;

/** 代码视图：Shiki(dark-plus) token 高亮 + 行号 + 虚拟滚动。大文件截断时不高亮。 */
export function CodeView({ file }: CodeViewProps) {
  const { text, truncated, loading, error } = useFileText(file.path, file.size);
  const [lines, setLines] = useState<ThemedToken[][] | null>(null);
  const [plain, setPlain] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 大文件（>5MB）已截断 → 纯文本不高亮，避免 Shiki 卡顿。
  const shouldHighlight = file.size <= HIGHLIGHT_SIZE_LIMIT && !truncated;

  useEffect(() => {
    if (text === null) {
      setLines(null);
      return;
    }
    if (!shouldHighlight) {
      setPlain(true);
      const rows = text.split('\n').map((line) => [{ content: line }]);
      setLines(rows);
      return;
    }
    setPlain(false);
    let cancelled = false;
    const lang = langForExt(file.ext);
    highlightToLines(text, lang)
      .then((rows) => {
        if (!cancelled) setLines(rows);
      })
      .catch(() => {
        if (cancelled) return;
        const rows = text.split('\n').map((line) => [{ content: line }]);
        setLines(rows);
        setPlain(true);
      });
    return () => {
      cancelled = true;
    };
  }, [text, file.ext, shouldHighlight]);

  const rows = useMemo(() => lines ?? [], [lines]);
  const gutterWidth = useMemo(() => `${String(rows.length).length + 1}ch`, [rows.length]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => LINE_HEIGHT,
    overscan: 30,
  });

  if (error) return <div className="error-box">{error}</div>;
  if (loading || lines === null) return <div className="loading-line">加载中…</div>;

  return (
    <div className="viewer-body code-view" ref={scrollRef}>
      {truncated && (
        <div className="viewer-note">
          大文件已截断（仅显示前 {Math.round(HIGHLIGHT_SIZE_LIMIT / (1024 * 1024))}MB
          {plain ? '，纯文本不高亮' : ''}）
        </div>
      )}
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const tokens = rows[vItem.index];
          return (
            <div
              key={vItem.key}
              className="code-row"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: LINE_HEIGHT,
                transform: `translateY(${vItem.start}px)`,
                display: 'flex',
              }}
            >
              <span
                className="gutter"
                style={{ minWidth: gutterWidth, position: 'static', display: 'inline-block' }}
              >
                {vItem.index + 1}
              </span>
              <span className="line" style={{ display: 'inline-block' }}>
                {tokens.map((tok, i) => (
                  <span key={i} style={tok.color ? { color: tok.color } : undefined}>
                    {tok.content}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
