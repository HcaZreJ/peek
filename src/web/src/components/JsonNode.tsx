import { useEffect, useRef, useState } from 'react';

/** 全局展开/折叠命令：seq 每次递增，open 表示目标状态。 */
export interface TreeCmd {
  seq: number;
  open: boolean;
}

interface JsonNodeProps {
  value: unknown;
  // 该节点对应的键名（对象成员）或索引（数组成员）；根节点为 undefined。
  nodeKey?: string | number;
  // 是否数组索引（影响键名是否带引号渲染）。
  isArrayItem?: boolean;
  depth: number;
  // 最近一次全局展开/折叠命令；新挂载节点以它为初始态，seq 变化时应用。
  cmd: TreeCmd | null;
  // 是否在尾部渲染逗号。
  trailingComma?: boolean;
}

const INDENT = 16;

function isContainer(v: unknown): v is object {
  return typeof v === 'object' && v !== null;
}

/** 渲染基本类型值的着色片段。 */
function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span className="json-null">null</span>;
  switch (typeof value) {
    case 'string':
      return <span className="json-string">{JSON.stringify(value)}</span>;
    case 'number':
      return <span className="json-number">{String(value)}</span>;
    case 'boolean':
      return <span className="json-boolean">{String(value)}</span>;
    default:
      return <span className="json-string">{JSON.stringify(value)}</span>;
  }
}

function KeyLabel({ nodeKey, isArrayItem }: { nodeKey?: string | number; isArrayItem?: boolean }) {
  if (nodeKey === undefined || isArrayItem) return null;
  return (
    <>
      <span className="json-key">"{String(nodeKey)}"</span>
      <span className="json-punct">: </span>
    </>
  );
}

/** 可折叠 JSON 树节点。对象/数组可展开收起，基本类型直接渲染。 */
export function JsonNode({ value, nodeKey, isArrayItem, depth, cmd, trailingComma }: JsonNodeProps) {
  // 默认根与第一层展开；若已有全局命令，以命令状态为初始态（虚拟滚动重挂时保持一致）。
  const [expanded, setExpanded] = useState(cmd ? cmd.open : depth < 1);
  const seenSeq = useRef(cmd?.seq ?? 0);

  useEffect(() => {
    if (cmd && cmd.seq !== seenSeq.current) {
      seenSeq.current = cmd.seq;
      setExpanded(cmd.open);
    }
  }, [cmd]);

  const pad = { paddingLeft: depth * INDENT };

  if (!isContainer(value)) {
    return (
      <div className="json-node" style={pad}>
        <span className="json-toggle" />
        <KeyLabel nodeKey={nodeKey} isArrayItem={isArrayItem} />
        <Primitive value={value} />
        {trailingComma && <span className="json-punct">,</span>}
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const open = isArray ? '[' : '{';
  const close = isArray ? ']' : '}';
  const entries: Array<[string | number, unknown]> = isArray
    ? (value as unknown[]).map((v, i) => [i, v])
    : Object.entries(value as Record<string, unknown>);

  const count = entries.length;

  if (count === 0) {
    return (
      <div className="json-node" style={pad}>
        <span className="json-toggle" />
        <KeyLabel nodeKey={nodeKey} isArrayItem={isArrayItem} />
        <span className="json-punct">
          {open}
          {close}
        </span>
        {trailingComma && <span className="json-punct">,</span>}
      </div>
    );
  }

  const summary = isArray ? `${count} 项` : `${count} 键`;

  return (
    <div>
      <div
        className="json-node json-collapsible"
        style={pad}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
      >
        <span className="json-toggle">{expanded ? '▾' : '▸'}</span>
        <KeyLabel nodeKey={nodeKey} isArrayItem={isArrayItem} />
        <span className="json-punct">{open}</span>
        {!expanded && (
          <>
            <span className="json-preview"> {summary} </span>
            <span className="json-punct">{close}</span>
            {trailingComma && <span className="json-punct">,</span>}
          </>
        )}
      </div>
      {expanded && (
        <>
          {entries.map(([k, v], idx) => (
            <JsonNode
              key={String(k)}
              value={v}
              nodeKey={k}
              isArrayItem={isArray}
              depth={depth + 1}
              cmd={cmd}
              trailingComma={idx < count - 1}
            />
          ))}
          <div className="json-node" style={pad}>
            <span className="json-toggle" />
            <span className="json-punct">{close}</span>
            {trailingComma && <span className="json-punct">,</span>}
          </div>
        </>
      )}
    </div>
  );
}
