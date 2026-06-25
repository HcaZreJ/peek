import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// peek 前端：开发时由 vite dev server 提供，/api 代理到本地 Node 服务；
// 生产时构建为静态资源，由 Node 服务直接托管。
const webRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: webRoot,
  plugins: [react()],
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../../dist/web', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    port: 5319,
    proxy: {
      '/api': 'http://127.0.0.1:5318',
    },
  },
});
