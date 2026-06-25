import { useEffect, useState } from 'react';
import type { FileMeta } from '../../../shared/types';
import { useFileText } from '../lib/useFileText';
import { parseJsonSafe } from '../../../shared/jsonView';
import { highlightToHtml } from '../lib/highlight';
import { JsonNode } from './JsonNode';

interface JsonViewProps {
  file: FileMeta;
}

type Mode = 'tree' | 'source';

/** 转义后再注入 HTML，避免 JSON 内容里的尖括号被当作标签执行。 */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** JSON 视图：折叠交互树 / 格式化原文 切换。解析失败 → 当作文本提示。 */
export function JsonView({ file }: JsonViewProps) {
  const { text, truncated, loading, error } = useFileText(file.path, file.size);
  const [mode, setMode] = useState<Mode>('tree');
  const [expandSignal, setExpandSignal] = useState(0);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [sourceHtml, setSourceHtml] = useState<string | null>(null);

  const parsed = text === null ? null : parseJsonSafe(text);

  // 格式化原文经 Shiki(json) 高亮。
  useEffect(() => {
    if (mode !== 'source' || !parsed || !parsed.ok) return;
    let cancelled = false;
    setSourceHtml(null);
    const pretty = JSON.stringify(parsed.value, null, 2);
    highlightToHtml(pretty, 'json')
      .then((html) => {
        if (!cancelled) setSourceHtml(html);
      })
      .catch(() => {
        if (!cancelled) setSourceHtml(`<pre>${escapeHtml(pretty)}</pre>`);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, text, parsed]);

  useEffect(() => {
    setMode('tree');
    setSourceHtml(null);
  }, [file.path]);

  if (error) return <div className="error-box">{error}</div>;
  if (loading || text === null || parsed === null) {
    return <div className="loading-line">加载中…</div>;
  }

  // 解析失败：当作文本，提示错误。
  if (!parsed.ok) {
    return (
      <div className="viewer">
        <div className="viewer-note">JSON 解析失败：{parsed.error}（按原文显示）</div>
        <div className="viewer-body">
          <pre className="markdown-source">{text}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="viewer">
      <div className="viewer-toolbar">
        <div className="seg">
          <button className={mode === 'tree' ? 'active' : ''} onClick={() => setMode('tree')}>
            树
          </button>
          <button className={mode === 'source' ? 'active' : ''} onClick={() => setMode('source')}>
            格式化原文
          </button>
        </div>
        {mode === 'tree' && (
          <div className="seg">
            <button onClick={() => setExpandSignal((n) => n + 1)}>全展开</button>
            <button onClick={() => setCollapseSignal((n) => n + 1)}>全折叠</button>
          </div>
        )}
      </div>
      {truncated && <div className="viewer-note">大文件已截断（仅显示前 5MB）</div>}
      <div className="viewer-body">
        {mode === 'tree' ? (
          <div className="json-view">
            <JsonNode
              value={parsed.value}
              depth={0}
              expandSignal={expandSignal}
              collapseSignal={collapseSignal}
            />
          </div>
        ) : sourceHtml === null ? (
          <div className="loading-line">高亮中…</div>
        ) : (
          <div className="json-source" dangerouslySetInnerHTML={{ __html: sourceHtml }} />
        )}
      </div>
    </div>
  );
}
