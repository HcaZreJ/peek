import { useEffect, useState } from 'react';
import type { DirEntry } from '../../../shared/types';
import { fetchDir } from '../lib/api';
import { TreeNode } from './TreeNode';

interface FileTreeProps {
  rootPath: string;
  selectedPath: string | null;
  onSelectFile: (entry: DirEntry) => void;
  onGoUp: () => void;
  canGoUp: boolean;
}

/** 文件树：根目录直接展开，子目录懒加载。顶部「↑ 上级目录」可逃出 repo root。 */
export function FileTree({
  rootPath,
  selectedPath,
  onSelectFile,
  onGoUp,
  canGoUp,
}: FileTreeProps) {
  const [entries, setEntries] = useState<DirEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    setError(null);
    fetchDir(rootPath)
      .then((items) => {
        if (!cancelled) setEntries(items);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  return (
    <div className="tree">
      {canGoUp && (
        <button className="up-btn" onClick={onGoUp} title="把树根设为上级目录">
          ↑ 上级目录
        </button>
      )}
      {error && <div className="tree-error">{error}</div>}
      {!error && entries === null && <div className="tree-loading">加载中…</div>}
      {entries && entries.length === 0 && <div className="tree-empty">空目录</div>}
      {entries?.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}
