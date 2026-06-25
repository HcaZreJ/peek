import type { FileKind } from './types';

/** 已知代码扩展名（小写，不含点）。 */
export const CODE_EXTS: ReadonlySet<string> = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'kt', 'kts',
  'c', 'h', 'cpp', 'hpp', 'cc', 'cxx', 'cs', 'rb', 'php', 'swift', 'scala',
  'sh', 'bash', 'zsh', 'fish', 'sql', 'yaml', 'yml', 'toml', 'ini', 'cfg',
  'css', 'scss', 'sass', 'less', 'html', 'htm', 'xml', 'vue', 'svelte',
  'lua', 'r', 'dart', 'pl', 'pm', 'ex', 'exs', 'erl', 'clj', 'hs', 'ml',
]);

/**
 * 按扩展名 + 内容样本判定文件类型。
 * 扩展名映射优先（md→markdown, json→json, jsonl/ndjson→jsonl, 代码集→code）；
 * 无匹配时：sample 含 NUL 字节→binary，否则→text。
 *
 * @param ext 扩展名（含或不含前导点，大小写不限）
 * @param sample 文件头部解码文本（≤8KB）
 */
export function detectFileKind(ext: string, sample: string): FileKind {
  const normalized = ext.toLowerCase().replace(/^\./, '');

  if (normalized === 'md' || normalized === 'markdown') return 'markdown';
  if (normalized === 'json') return 'json';
  if (normalized === 'jsonl' || normalized === 'ndjson') return 'jsonl';
  if (normalized !== '' && CODE_EXTS.has(normalized)) return 'code';

  // No extension match — fall back to sample inspection
  if (sample.includes('\0')) return 'binary';
  return 'text';
}
