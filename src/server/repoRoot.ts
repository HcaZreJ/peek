import { access, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { RepoRootInfo } from '../shared/types';

/** repo 标记，按发现优先级从高到低排列。 */
export const REPO_MARKERS: readonly string[] = ['.git', '.hg', '.svn'];

/**
 * 检查单个目录中命中的**最高优先级**标记（按 REPO_MARKERS 顺序），无则 null。
 * 标记可以是文件或目录。dir 不存在 → null（不抛）。
 */
export async function findMarkerInDir(dir: string): Promise<string | null> {
  for (const marker of REPO_MARKERS) {
    try {
      await access(join(dir, marker));
      return marker;
    } catch {
      // not found, try next
    }
  }
  return null;
}

/**
 * 从 startPath 逐级向上发现 repo root:
 * - startPath 是文件 → 取其目录为起点
 * - 某级命中任一 REPO_MARKERS 标记 → 立即返回该级
 * - 到 fs root 仍无命中 → `{ repoRoot: 起点目录, marker: null }`
 *
 * @throws Error 带 `code: 'ENOENT'` 当 startPath 不存在
 */
export async function discoverRepoRoot(startPath: string): Promise<RepoRootInfo> {
  const stats = await stat(startPath);
  const startDir = stats.isDirectory() ? startPath : dirname(startPath);

  let dir = startDir;

  while (true) {
    const marker = await findMarkerInDir(dir);
    if (marker !== null) {
      return { repoRoot: dir, marker };
    }
    const parent = dirname(dir);
    if (parent === dir) {
      // reached filesystem root
      break;
    }
    dir = parent;
  }

  return { repoRoot: startDir, marker: null };
}
