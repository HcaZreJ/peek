import path from 'node:path';

/**
 * 计算 absPath 相对 repoRoot 的 POSIX 风格相对路径（无前导 ./）。
 * - absPath 在 repoRoot 内 → 返回相对段（如 `a/b.ts`）
 * - absPath 等于 repoRoot → 返回其 basename
 * - absPath 在 repoRoot 外 → 回退返回原 absPath
 *
 * @throws Error('expected absolute path') 当任一入参非绝对路径
 */
export function toRepoRelative(repoRoot: string, absPath: string): string {
  if (!repoRoot || !repoRoot.startsWith('/')) throw new Error('expected absolute path');
  if (!absPath || !absPath.startsWith('/')) throw new Error('expected absolute path');

  // Normalize repoRoot: strip trailing slash unless it's the root '/'
  const root = repoRoot.length > 1 && repoRoot.endsWith('/') ? repoRoot.slice(0, -1) : repoRoot;

  if (absPath === root) {
    return path.posix.basename(root);
  }

  if (absPath.startsWith(root === '/' ? '/' : root + '/')) {
    // Strip the root prefix (and the trailing slash after it)
    const prefix = root === '/' ? '/' : root + '/';
    return absPath.slice(prefix.length);
  }

  return absPath;
}

/**
 * 规范化用户请求路径：展开前导 `~`、解析 `.`/`..`、转绝对路径。
 *
 * @param requested 原始请求路径
 * @param home 用户 home 目录（用于展开 `~`）
 * @throws Error('invalid path') 当 requested 含 NUL 字节
 */
export function normalizeRequestedPath(requested: string, home: string): string {
  if (requested.includes('\0')) throw new Error('invalid path');

  let expanded: string;
  if (requested === '~') {
    expanded = home;
  } else if (requested.startsWith('~/')) {
    expanded = path.posix.join(home, requested.slice(2));
  } else {
    expanded = requested;
  }

  const result = path.posix.normalize(expanded);

  if (!result.startsWith('/')) throw new Error('expected absolute path');

  return result;
}
