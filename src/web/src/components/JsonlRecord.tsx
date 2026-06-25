import { useState } from 'react';
import { summarizeRecord } from '../../../shared/jsonView';
import { JsonNode } from './JsonNode';

interface JsonlRecordProps {
  lineNo: number; // 1-based 行号
  raw: string;
  // 预解析结果：ok 时持有 value；否则为坏行。
  parsed: { ok: true; value: unknown } | { ok: false; error: string };
}

/** JSONL 记录流单行：折叠态单行摘要，展开成 JSON 树；坏行标红显示原文。 */
export function JsonlRecord({ lineNo, raw, parsed }: JsonlRecordProps) {
  const [expanded, setExpanded] = useState(false);
  const bad = !parsed.ok;

  return (
    <div className={`jsonl-record${bad ? ' bad' : ''}`}>
      <span className="lineno">{lineNo}</span>
      <div className="rec-body">
        {bad ? (
          <div className="rec-summary" title={parsed.error}>
            {raw === '' ? '（空行）' : raw}
          </div>
        ) : expanded ? (
          <div className="json-view" style={{ padding: 0 }} onClick={() => setExpanded(false)}>
            <JsonNode value={parsed.value} depth={0} expandSignal={0} collapseSignal={0} />
          </div>
        ) : (
          <div className="rec-summary" onClick={() => setExpanded(true)}>
            {summarizeRecord(parsed.value)}
          </div>
        )}
      </div>
    </div>
  );
}
