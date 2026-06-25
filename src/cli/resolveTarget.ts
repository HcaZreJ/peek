import { stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * 把 CLI target 解析为绝对路径：展开前导 `~`、相对 cwd 转绝对、校验存在。
 *
 * @param target 原始 target（如 '.'、'a.jsonl'、'~/x/y'）
 * @param cwd 当前工作目录（绝对）
 * @param home 用户 home 目录
 * @returns 绝对路径
 * @throws Error 带 `code: 'ENOENT'` 当路径不存在
 */
export async function resolveTarget(target: string, cwd: string, home: string): Promise<string> {
  let expanded: string;
  if (target === '~') {
    expanded = home;
  } else if (target.startsWith('~/')) {
    expanded = path.join(home, target.slice(2));
  } else {
    expanded = target;
  }

  const resolved = path.isAbsolute(expanded)
    ? path.resolve(expanded)
    : path.resolve(cwd, expanded);

  await stat(resolved);
  return resolved;
}
