import { useEffect, useRef, useState } from 'react';
import { summarizeRecord } from '../../../shared/jsonView';
import { JsonNode, type TreeCmd } from './JsonNode';

interface JsonlRecordProps {
  lineNo: number; // 1-based 行号
  raw: string;
  // 预解析结果：ok 时持有 value；否则为坏行。
  parsed: { ok: true; value: unknown } | { ok: false; error: string };
  // 最近一次全局展开/折叠命令（toolbar 的全展开/全折叠）。
  cmd: TreeCmd | null;
}

/**
 * JSONL 记录流单行：折叠态单行摘要，点摘要或行号展开成 JSON 树，点行号收起；
 * 坏行标红显示原文。全局命令同时控制记录本身与树的深层节点。
 */
export function JsonlRecord({ lineNo, raw, parsed, cmd }: JsonlRecordProps) {
  // 新挂载的行以最近全局命令为初始态（虚拟滚动重挂时与其它行保持一致）。
  const [expanded, setExpanded] = useState(cmd ? cmd.open : false);
  // 传给树的命令：全局命令原样下发；手动展开时置 null，让树用默认深度（根+第一层）。
  const [treeCmd, setTreeCmd] = useState<TreeCmd | null>(cmd);
  const seenSeq = useRef(cmd?.seq ?? 0);
  const bad = !parsed.ok;

  useEffect(() => {
    if (cmd && cmd.seq !== seenSeq.current) {
      seenSeq.current = cmd.seq;
      setExpanded(cmd.open);
      setTreeCmd(cmd);
    }
  }, [cmd]);

  const toggle = () => {
    setExpanded((v) => !v);
    setTreeCmd(null);
  };

  return (
    <div className={`jsonl-record${bad ? ' bad' : ''}`}>
      <span
        className="lineno"
        onClick={bad ? undefined : toggle}
        title={bad ? undefined : expanded ? '折叠' : '展开'}
      >
        {lineNo}
      </span>
      <div className="rec-body">
        {bad ? (
          <div className="rec-summary" title={parsed.error}>
            {raw === '' ? '（空行）' : raw}
          </div>
        ) : expanded ? (
          <div className="json-view" style={{ padding: 0 }}>
            <JsonNode value={parsed.value} depth={0} cmd={treeCmd} />
          </div>
        ) : (
          <div className="rec-summary" onClick={toggle}>
            {summarizeRecord(parsed.value)}
          </div>
        )}
      </div>
    </div>
  );
}
