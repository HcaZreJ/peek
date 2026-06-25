import type { FileMeta } from '../../../shared/types';

interface BinaryViewProps {
  file: FileMeta;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** 二进制文件兜底：不预览，仅显示基本信息。 */
export function BinaryView({ file }: BinaryViewProps) {
  return (
    <div className="placeholder">
      <div className="big">📦</div>
      <div>二进制文件，不预览</div>
      <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
        {file.ext ? `.${file.ext} · ` : ''}
        {formatSize(file.size)}
      </div>
    </div>
  );
}
