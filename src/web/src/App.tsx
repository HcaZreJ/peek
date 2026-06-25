import { useCallback, useEffect, useState } from 'react';
import type { DirEntry, FileMeta, RepoRootInfo } from '../../shared/types';
import { fetchRepoRoot, fetchFileMeta } from './lib/api';
import { FileTree } from './components/FileTree';
import { Viewer } from './components/Viewer';
import { Breadcrumb } from './components/Breadcrumb';
import { CopyMenu } from './components/CopyMenu';

interface InitState {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  repo: RepoRootInfo | null;
  // 文件树根目录（可因「上级目录」而偏离 repoRoot）。
  treeRoot: string;
  // 初始请求路径（用于决定是否打开文件）。
  initialPath: string;
}

/** 读取 ?path= 并 decode；缺省回退到 '/'。 */
function readPathParam(): string {
  const raw = new URLSearchParams(window.location.search).get('path');
  if (!raw) return '/';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** 取绝对路径的父目录。 */
function parentDir(p: string): string {
  if (p === '/') return '/';
  const trimmed = p.endsWith('/') ? p.slice(0, -1) : p;
  const idx = trimmed.lastIndexOf('/');
  if (idx <= 0) return '/';
  return trimmed.slice(0, idx);
}

export function App() {
  const [init, setInit] = useState<InitState>({
    status: 'loading',
    error: null,
    repo: null,
    treeRoot: '',
    initialPath: '',
  });
  const [file, setFile] = useState<FileMeta | null>(null);

  // 启动流程：repo-root → 判断文件/目录 → 载入查看器。
  useEffect(() => {
    let cancelled = false;
    const abs = readPathParam();

    (async () => {
      try {
        const repo = await fetchRepoRoot(abs);
        if (cancelled) return;
        // 判断 abs 是文件还是目录：file/meta 成功 → 文件；失败（含目录）→ 仅展示树。
        let openedFile: FileMeta | null = null;
        try {
          openedFile = await fetchFileMeta(abs);
        } catch {
          openedFile = null;
        }
        if (cancelled) return;
        setInit({
          status: 'ready',
          error: null,
          repo,
          treeRoot: repo.repoRoot,
          initialPath: abs,
        });
        setFile(openedFile);
      } catch (e) {
        if (cancelled) return;
        setInit({
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
          repo: null,
          treeRoot: '',
          initialPath: abs,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSelectFile = useCallback(async (entry: DirEntry) => {
    try {
      const meta = await fetchFileMeta(entry.path);
      setFile(meta);
    } catch (e) {
      setFile(null);
      // 显示错误但不打断整体（用一个最小的伪 meta 走 binary 兜底不合适，故仅记录）。
      console.error('open file failed:', e);
    }
  }, []);

  const onGoUp = useCallback(() => {
    setInit((prev) => {
      if (prev.status !== 'ready') return prev;
      const next = parentDir(prev.treeRoot);
      if (next === prev.treeRoot) return prev;
      return { ...prev, treeRoot: next };
    });
  }, []);

  if (init.status === 'loading') {
    return (
      <div className="app">
        <div className="loading-line">启动中…</div>
      </div>
    );
  }

  if (init.status === 'error' || !init.repo) {
    return (
      <div className="app">
        <div className="error-box">无法加载：{init.error}</div>
      </div>
    );
  }

  const { repo, treeRoot } = init;
  const repoRoot = repo.repoRoot;
  const repoName = repoRoot.split('/').filter(Boolean).pop() || repoRoot;
  const canGoUp = parentDir(treeRoot) !== treeRoot;

  return (
    <div className="app">
      <div className="topbar">
        <Breadcrumb repoRoot={repoRoot} filePath={file?.path ?? null} />
        <div className="toolbar">
          {file && <CopyMenu file={file} repoRoot={repoRoot} />}
        </div>
      </div>
      <div className="body">
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="repo-title">
              <span className="repo-name" title={repoRoot}>
                {repoName}
              </span>
              <span className="repo-marker">
                {repo.marker ? `repo root · ${repo.marker}` : 'no repo marker'}
              </span>
            </div>
          </div>
          <FileTree
            rootPath={treeRoot}
            selectedPath={file?.path ?? null}
            onSelectFile={onSelectFile}
            onGoUp={onGoUp}
            canGoUp={canGoUp}
          />
        </div>
        <div className="content">
          {file ? (
            <Viewer file={file} />
          ) : (
            <div className="placeholder">
              <div className="big">👁</div>
              <div>从左侧选择一个文件查看</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
