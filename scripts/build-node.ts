// 用 esbuild 把 CLI + Server 打包到 dist/（前端由 vite 单独构建到 dist/web）。
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

await build({
  entryPoints: [`${root}/src/cli/main.ts`, `${root}/src/server/main.ts`],
  outdir: `${root}/dist`,
  outbase: `${root}/src`,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  bundle: true,
  sourcemap: true,
  packages: 'external',
});

console.log('[peek] node 构建完成 → dist/');
