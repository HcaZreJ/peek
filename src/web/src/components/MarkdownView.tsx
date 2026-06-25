import { useEffect, useState } from 'react';
import type { FileMeta } from '../../../shared/types';
import { useFileText } from '../lib/useFileText';
import { renderMarkdown } from '../lib/markdown';

interface MarkdownViewProps {
  file: FileMeta;
}

type Mode = 'rendered' | 'source';

/** Markdown 视图：渲染（GFM + Shiki 代码块）/ 原文 切换。 */
export function MarkdownView({ file }: MarkdownViewProps) {
  const { text, truncated, loading, error } = useFileText(file.path, file.size);
  const [mode, setMode] = useState<Mode>('rendered');
  const [html, setHtml] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (text === null || mode !== 'rendered') return;
    if (html !== null) return;
    let cancelled = false;
    setRendering(true);
    renderMarkdown(text)
      .then((out) => {
        if (!cancelled) setHtml(out);
      })
      .catch(() => {
        if (!cancelled) setHtml('<p>渲染失败</p>');
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [text, mode, html]);

  // 切换文件时重置已渲染 HTML（useFileText 会随 path 变化重新加载 text）。
  useEffect(() => {
    setHtml(null);
    setMode('rendered');
  }, [file.path]);

  if (error) return <div className="error-box">{error}</div>;

  return (
    <div className="viewer">
      <div className="viewer-toolbar">
        <div className="seg">
          <button
            className={mode === 'rendered' ? 'active' : ''}
            onClick={() => setMode('rendered')}
          >
            渲染
          </button>
          <button
            className={mode === 'source' ? 'active' : ''}
            onClick={() => setMode('source')}
          >
            原文
          </button>
        </div>
      </div>
      {truncated && <div className="viewer-note">大文件已截断（仅显示前 5MB）</div>}
      <div className="viewer-body">
        {loading || text === null ? (
          <div className="loading-line">加载中…</div>
        ) : mode === 'source' ? (
          <pre className="markdown-source">{text}</pre>
        ) : rendering || html === null ? (
          <div className="loading-line">渲染中…</div>
        ) : (
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  );
}
