export interface ParsedArgs {
  /** 要打开的目标路径；无参时为 '.'。 */
  target: string;
}

/**
 * 解析 CLI 参数（传入 `process.argv.slice(2)`）。
 * - 无参 → `{ target: '.' }`
 * - 取第一个非 flag 参数作为 target
 * - 忽略未知 flag（v1 无 flag）
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const target = argv.find(arg => !arg.startsWith('-')) ?? '.';
  return { target };
}
