#!/usr/bin/env node
// 薄入口：转交给构建后的 CLI 实现（dist/cli/main.js）。
// 开发期可用 `npm run dev` / `tsx src/cli/main.ts` 直接跑源码。
import { fileURLToPath } from 'node:url';

const cliUrl = new URL('../dist/cli/main.js', import.meta.url);
try {
  await import(cliUrl.href);
} catch (err) {
  if (err && err.code === 'ERR_MODULE_NOT_FOUND') {
    console.error('[peek] 尚未构建。请先运行 `npm run build`（或开发期用 `tsx src/cli/main.ts`）。');
    console.error(`        缺少：${fileURLToPath(cliUrl)}`);
    process.exit(1);
  }
  throw err;
}
