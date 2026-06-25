import { useEffect, useRef, useState } from 'react';
import type { FileMeta } from '../../../shared/types';
import { toRepoRelative } from '../../../shared/pathUtils';
import { copyToClipboard } from '../lib/clipboard';
import { fetchFileChunk } from '../lib/api';

interface CopyMenuProps {
  file: FileMeta;
  repoRoot: string;
}

function basename(p: string): string {
  const parts = p.split('/');
  return parts[parts.length - 1] || p;
}

/** 当前打开文件时可用的复制菜单：文件名 / 绝对路径 / 相对 repo 路径 / 文件内容。 */
export function CopyMenu({ file, repoRoot }: CopyMenuProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const flash = (label: string) => {
    setToast(label);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1400);
  };

  const doCopy = async (action: 'name' | 'abs' | 'rel' | 'content') => {
    setOpen(false);
    try {
      let text: string;
      switch (action) {
        case 'name':
          text = basename(file.path);
          break;
        case 'abs':
          text = file.path;
          break;
        case 'rel':
          text = toRepoRelative(repoRoot, file.path);
          break;
        case 'content': {
          // 读取整文件内容（上限 20MB，避免超大文件卡死）。
          const chunk = await fetchFileChunk(file.path, 0, 20 * 1024 * 1024);
          text = chunk.data;
          break;
        }
      }
      await copyToClipboard(text);
      flash('已复制');
    } catch {
      flash('复制失败');
    }
  };

  return (
    <div className="copy-menu" ref={rootRef}>
      {toast && <span className="copy-toast">{toast}</span>}
      <button className="copy-btn" onClick={() => setOpen((v) => !v)} title="复制">
        ⧉ 复制 ▾
      </button>
      {open && (
        <div className="copy-dropdown" role="menu">
          <button onClick={() => doCopy('name')}>文件名</button>
          <button onClick={() => doCopy('abs')}>绝对路径</button>
          <button onClick={() => doCopy('rel')}>相对 repo root 路径</button>
          <button onClick={() => doCopy('content')}>文件内容</button>
        </div>
      )}
    </div>
  );
}
