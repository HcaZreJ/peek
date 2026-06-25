import type { FileMeta } from '../../../shared/types';
import { CodeView } from './CodeView';
import { MarkdownView } from './MarkdownView';
import { JsonView } from './JsonView';
import { JsonlView } from './JsonlView';
import { TextView } from './TextView';
import { BinaryView } from './BinaryView';

interface ViewerProps {
  file: FileMeta;
}

/** 按 file.kind 分派到对应查看器。code/text 自带 viewer-body；其余自带 viewer 容器。 */
export function Viewer({ file }: ViewerProps) {
  switch (file.kind) {
    case 'code':
      // CodeView 渲染滚动容器本身，包一层 viewer 以统一布局。
      return (
        <div className="viewer">
          <CodeView key={file.path} file={file} />
        </div>
      );
    case 'markdown':
      return <MarkdownView key={file.path} file={file} />;
    case 'json':
      return <JsonView key={file.path} file={file} />;
    case 'jsonl':
      return <JsonlView key={file.path} file={file} />;
    case 'text':
      return (
        <div className="viewer">
          <TextView key={file.path} file={file} />
        </div>
      );
    case 'binary':
      return <BinaryView key={file.path} file={file} />;
    default:
      return <BinaryView key={file.path} file={file} />;
  }
}
