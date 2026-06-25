// peek 跨端共享类型。server 产出、web 消费。

export type FileKind = 'code' | 'markdown' | 'json' | 'jsonl' | 'text' | 'binary';

export interface DirEntry {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size: number;
  mtimeMs: number;
  ext: string;
}

export interface FileMeta {
  path: string;
  size: number;
  mtimeMs: number;
  ext: string;
  kind: FileKind;
}

export interface RepoRootInfo {
  repoRoot: string;
  marker: string | null;
}

export interface FileChunk {
  data: string;
  offset: number;
  bytesRead: number;
  eof: boolean;
}

export interface JsonlSlice {
  from: number;
  lines: string[];
  total: number;
}
