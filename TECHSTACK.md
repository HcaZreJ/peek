# TECHSTACK

## 项目定位
`peek` —— 轻量化本地**只读**文件查看器。CLI 启动，浏览器专属窗口渲染。详见 [设计文档](docs/superpowers/specs/2026-06-24-peek-file-viewer-design.md)。

## 语言 / 运行时
- **Node.js >= 20**（开发机 v22.22.1）
- **TypeScript 5.9**，全量 strict
- 模块系统：`"type": "module"`（ESM）。Node 侧 `NodeNext`，Web 侧 `Bundler` 解析。

## 三个模块（互不越界）
| 模块 | 目录 | 运行环境 | 职责 |
|---|---|---|---|
| CLI | `src/cli/` | Node | 解析参数、发现 repo root、发现/启动 server、用 `--app` 开专属窗口 |
| Server | `src/server/` | Node | 文件系统 API（列目录/读文件/元数据/repo-root/jsonl 行区间）、托管前端静态包；仅绑 `127.0.0.1` |
| Web UI | `src/web/` | 浏览器 | 全部渲染与交互（文件树、tab、代码/md/json/jsonl 渲染、复制四件套）|
| Shared | `src/shared/` | 两侧 | 跨 server/web 共享的类型与纯函数（如 file kind、路径工具）|

**铁律**：Web 不直接碰磁盘，只通过 HTTP API；CLI/Server 不写渲染逻辑。

## 依赖
### 运行时（dependencies）
- 暂无强制运行时三方依赖；Server/CLI 优先用 Node 内置（`node:http`、`node:fs`、`node:child_process`）。

### 前端（打包进静态产物）
- `react` 19 / `react-dom` 19 —— UI 框架
- `shiki` 1.29 —— 代码高亮，**直接加载 VSCode TextMate 主题（dark-plus / dark modern）**，颜色与用户 VSCode 一致
- `markdown-it` 14 —— Markdown 渲染（GFM）；代码块复用 Shiki
- `@tanstack/react-virtual` 3 —— 虚拟滚动（大文件 / JSONL 海量行）

### 构建 / 测试（devDependencies）
- `vite` 6 + `@vitejs/plugin-react` —— 前端构建/开发服务
- `esbuild` 0.24 —— 打包 CLI/Server 到 `dist/`
- `tsx` 4 —— 开发期直接运行 TS
- `typescript` 5.9 —— 类型检查
- `vitest` 2.1 —— 单元测试（visible / hidden 双层）

> 安全：`npm audit --omit=dev` = 0 漏洞；devDependencies 的告警不进产物。

## 目录结构
```
peek/
├── bin/peek.mjs               # CLI 薄入口 → dist/cli/main.js
├── src/
│   ├── cli/                   # 参数解析 / repo-root / server 控制 / 开窗
│   ├── server/                # HTTP server + fs API + file kind
│   ├── shared/                # 跨端类型 & 纯函数
│   └── web/                   # Vite + React 前端
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── src/{components,lib}/
├── tests/{visible,hidden}/    # 双层单元测试
├── scripts/                   # 构建 & hidden-test 运行器
├── docs/superpowers/specs/    # 设计文档
├── .claude/plans/             # 函数级分解计划（跨 session）
├── tsconfig.json              # Node 侧
└── package.json
```

## 构建产物
- `npm run build:web` → `dist/web/`（静态前端）
- `npm run build:node` → `dist/cli/main.js`、`dist/server/main.js`
- 发布形态：npm 包，`bin.peek` 指向 `bin/peek.mjs`。
