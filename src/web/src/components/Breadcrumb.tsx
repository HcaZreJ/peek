import { Fragment } from 'react';
import { toRepoRelative } from '../../../shared/pathUtils';

interface BreadcrumbProps {
  repoRoot: string;
  filePath: string | null;
}

/** 面包屑：显示当前文件相对 repoRoot 的路径分段。无文件时显示 repo root 名。 */
export function Breadcrumb({ repoRoot, filePath }: BreadcrumbProps) {
  const rootName = repoRoot.split('/').filter(Boolean).pop() || repoRoot;

  if (!filePath) {
    return (
      <div className="breadcrumb">
        <span className="crumb-active">{rootName}</span>
      </div>
    );
  }

  // 相对路径在 repo 内 → 分段渲染；在 repo 外（逃出 root）→ 直接显示绝对路径。
  const rel = toRepoRelative(repoRoot, filePath);
  const insideRepo = rel !== filePath;
  const segments = insideRepo ? [rootName, ...rel.split('/')] : filePath.split('/').filter(Boolean);

  return (
    <div className="breadcrumb" title={filePath}>
      {segments.map((seg, i) => {
        const last = i === segments.length - 1;
        return (
          <Fragment key={i}>
            {i > 0 && <span className="crumb-sep">›</span>}
            <span className={last ? 'crumb-active' : ''}>{seg}</span>
          </Fragment>
        );
      })}
    </div>
  );
}
