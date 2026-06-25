import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPeekServer } from './server';

// 构建后该文件位于 dist/server/main.js，前端静态包在 dist/web。
const distWebDir = fileURLToPath(new URL('../web', import.meta.url));
const lockDir = join(homedir(), '.peek');
const lockFile = join(lockDir, 'port');

const server = createPeekServer({ distWebDir });

server.listen(0, '127.0.0.1', async () => {
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  // CLI 通过 stdout 这一行拿到端口。
  console.log(`PEEK_PORT=${port}`);
  try {
    await mkdir(lockDir, { recursive: true });
    await writeFile(lockFile, String(port), 'utf8');
  } catch {
    // 锁文件写失败不致命：CLI 仍可从 stdout 读端口。
  }
});

// 优雅退出：清理锁文件。
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
