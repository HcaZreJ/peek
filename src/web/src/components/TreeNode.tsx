import { useState } from 'react';
import type { DirEntry } from '../../../shared/types';
import { fetchDir } from '../lib/api';

interface TreeNodeProps {
  entry: DirEntry;
  depth: number;
  selectedPath: string | null;
  onSelectFile: (entry: DirEntry) => void;
}

function fileIcon(entry: DirEntry, expanded: boolean): string {
  if (entry.type === 'dir') return expanded ? '📂' : '📁';
  switch (entry.ext) {
    case 'md':
    case 'markdown':
      return '📝';
    case 'json':
    case 'jsonl':
    case 'ndjson':
      return '🗂️';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
      return '🖼️';
    default:
      return '📄';
  }
}

/** 单个树节点：目录可展开懒加载子项；文件点击载入查看器。 */
export function TreeNode({ entry, depth, selectedPath, onSelectFile }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DirEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDir = entry.type === 'dir';
  const isSelected = selectedPath === entry.path;
  const indent = 4 + depth * 14;

  const toggle = async () => {
    if (!isDir) {
      onSelectFile(entry);
      return;
    }
    const next = !expanded;
    setExpanded(next);
    if (next && children === null && !loading) {
      setLoading(true);
      setError(null);
      try {
        const items = await fetchDir(entry.path);
        setChildren(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="tree-children">
      <div
        className={`tree-node${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft: indent }}
        onClick={toggle}
        title={entry.path}
      >
        <span className="twisty">{isDir ? (expanded ? '▾' : '▸') : ''}</span>
        <span className="node-icon">{fileIcon(entry, expanded)}</span>
        <span className="node-name">{entry.name}</span>
      </div>
      {isDir && expanded && (
        <div>
          {loading && (
            <div className="tree-loading" style={{ paddingLeft: indent + 20 }}>
              加载中…
            </div>
          )}
          {error && (
            <div className="tree-error" style={{ paddingLeft: indent + 20 }}>
              {error}
            </div>
          )}
          {!loading && !error && children && children.length === 0 && (
            <div className="tree-empty" style={{ paddingLeft: indent + 20 }}>
              空目录
            </div>
          )}
          {children?.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
