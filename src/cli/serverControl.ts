import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const lockFile = join(homedir(), '.peek', 'port');

async function healthCheck(port: number): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 600);
    const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

/** 读锁文件并健康检查，返回在跑的服务端口；失效返回 null。 */
export async function findRunningServer(): Promise<number | null> {
  try {
    const port = Number((await readFile(lockFile, 'utf8')).trim());
    if (!Number.isInteger(port) || port <= 0) return null;
    return (await healthCheck(port)) ? port : null;
  } catch {
    return null;
  }
}

/** 拉起后台服务进程（detached），从其 stdout 读取端口后返回。 */
export function startServer(): Promise<number> {
  const serverEntry = fileURLToPath(new URL('../server/main.js', import.meta.url));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverEntry], {
      detached: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let buf = '';
    const onData = (d: Buffer) => {
      buf += d.toString();
      const m = buf.match(/PEEK_PORT=(\d+)/);
      if (m) {
        child.stdout?.off('data', onData);
        child.unref();
        resolve(Number(m[1]));
      }
    };
    child.stdout?.on('data', onData);
    child.on('error', reject);
    setTimeout(() => reject(new Error('server start timeout')), 6000);
  });
}

/** 复用在跑的服务，否则启动一个。 */
export async function ensureServer(): Promise<number> {
  return (await findRunningServer()) ?? (await startServer());
}
