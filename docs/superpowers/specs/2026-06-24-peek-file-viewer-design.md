# peek — 轻量化本地文件查看器 设计文档

- **日期**：2026-06-24
- **状态**：Design（待用户 review）
- **命令名**：`peek`
- **项目位置**：`~/Documents/peek`

## 1. 一句话定义

一个由 CLI 启动的本地**只读**文件查看器：`peek .` 起一个本地服务并弹出专属窗口，左侧文件树（项目内外目录都能逛），右侧按文件类型智能渲染——代码语法高亮、Markdown 预览、JSON/JSONL 交互式查看，随手复制文件名 / 路径 / 内容。配色对齐用户的 VSCode **Dark Modern**。

## 2. 背景与动机

新范式下编码主要在 CLI 里与 AI 协作完成，重型 IDE（VSCode/IntelliJ）提供的编译/调试/插件体系大多已不需要，但偶尔仍需人眼查看产物：md、json/jsonl 数据、py/ts 代码。现有方案各有缺口：

- **TUI（nvim/yazi 等）**：键位反直觉、`Ctrl+C` 不复制，体验割裂。
- **重型 IDE**：冷启慢、占用高、功能冗余。
- **macOS QuickLook + 插件**：零成本、能高亮+预览 md，但①寄生在 Finder 上、依赖 Finder 导航，不是独立工具；②看不了 JSON/JSONL（不格式化、jsonl 不识别）。

`peek` 填补的正是这个缺口：**独立 + 轻量 + 便捷导航 + 美观 + 原生复制 + 真正能看 JSON/JSONL**。

## 3. 目标 / 非目标

### 目标（v1）
- **Repo-root 自动发现**：从目标路径逐级向上找标记（`.git` 等），把文件树根**钉在 repo root**；仍可向上逃出到外部目录。
- 文件树导航：以 repo root（或传入目录）为根，可向上/向下浏览项目内外文件。
- 智能渲染四类内容：代码高亮、Markdown 预览、JSON 交互树、JSONL 记录流/表格。纯文本兜底。
- 复制四件套：文件名、绝对路径、**相对 repo root 的路径**、文件内容（原生 `Cmd/Ctrl+C` 行为）。
- 配色对齐 VSCode Dark Modern（代码与 md 代码块）。
- CLI 一行启动；服务复用使二次打开瞬开。
- 大文件不卡（虚拟滚动 + 流式/懒解析）。

### 非目标（明确不做）
- 编辑、保存、格式化写回。
- LSP、补全、debug、运行、终端、git 集成。
- 跨目录全局内容搜索（文件内搜索可留作 v2）。
- 插件系统、多主题市场。
- 账户、云同步、远程文件系统。

## 4. 架构总览（三个模块，各司其职）

```
┌─────────┐   spawn + open     ┌──────────────────────┐    HTTP API     ┌──────────────────┐
│   CLI    │ ─────────────────▶ │  Local Server (Node) │ ◀────────────── │  Web UI (browser) │
│  peek    │   --app 专属窗口    │  文件系统 API + 静态托管 │  /api/dir /file  │  React + Shiki    │
└─────────┘                    └──────────────────────┘                 └──────────────────┘
                                         │ fs 读
                                         ▼
                                    本地磁盘
```

| 模块 | 职责 | 边界（不做什么） |
|---|---|---|
| **CLI（`peek`）** | 解析参数→发现/启动本地服务→用 `--app` 打开专属窗口到对应路径 | 不渲染、不读文件内容 |
| **Server** | 文件系统 API（列目录、读文件、元数据，大文件分块/流式）；托管前端静态包 | 不做渲染逻辑，只吐数据；只绑 `127.0.0.1` |
| **Web UI** | 全部渲染与交互：文件树、tab、代码高亮、md 预览、json/jsonl 视图、复制 | 不直接碰磁盘，只调 server API |

**接口契约**：UI 永远通过 HTTP API 跟磁盘交互。换外壳（将来升 Tauri）时这套前端原封不动，只替换"server"为 Tauri 的 IPC 命令。

## 5. Server API 契约（初稿）

- `GET /api/repo-root?path=<abs>` → `{ repoRoot, marker }`（逐级向上发现的 repo root 及命中的标记；未命中返回该路径自身的目录）。
- `GET /api/dir?path=<abs>` → 目录条目列表：`{ name, path, type: 'dir'|'file', size, mtime, ext }[]`。
- `GET /api/file/meta?path=<abs>` → `{ path, size, mtime, ext, detectedKind: 'code'|'markdown'|'json'|'jsonl'|'text'|'binary' }`。
- `GET /api/file?path=<abs>&offset=&limit=` → 文件内容（支持 Range/分块；大文件可分段拉取）。
- `GET /api/jsonl?path=<abs>&from=&count=` → 指定行区间的若干条记录（服务端按行切，前端懒解析）。
- 静态：`GET /*` → 前端打包产物。
- 安全：仅监听 `127.0.0.1`；可选一次性 token（`?token=` 或 header）防同机其他进程访问；路径做规范化校验。

## 6. 技术选型

- **后端**：Node.js + TypeScript。HTTP 用极薄方案（内置 `http` 或微框架），运行时依赖尽量少，保证秒起。
- **前端**：Vite + React + TypeScript，打包为静态资源内置进 CLI 包随发。
- **代码高亮：Shiki**。直接加载 VSCode 的 TextMate 语法 + **Dark Modern / Dark+ 主题**，颜色与用户 VSCode 逐像素一致。
- **Markdown**：markdown-it + GFM；代码块复用 Shiki。Mermaid / KaTeX 留作 v2。
- **JSON/JSONL**：自研虚拟化组件，虚拟滚动用 TanStack Virtual。
- **打包/分发**：npm 包，`npm i -g` 后得到 `peek` 命令（或本地 `npm link`）。

## 7. 渲染设计（按文件类型）

### 7.1 代码（.py / .ts / .js / .go / ... ）
- Shiki 高亮 + Dark Modern 主题；行号；自动换行可切换。
- 超过阈值（约 5MB）退化为纯文本虚拟滚动，不做高亮以保流畅。

### 7.2 Markdown（.md）
- markdown-it 渲染为 HTML：标题、列表、表格、任务列表、代码块（Shiki 高亮）。
- 可切「渲染视图 / 原文视图」。

### 7.3 JSON（.json）——差异化核心之一
- 解析为**可折叠交互树**：展开/收起节点、一键全展开/全折叠、类型着色、键名搜索过滤。
- 切换「树视图 / 格式化原文（Shiki 高亮的 pretty JSON）」。
- 大数组虚拟滚动。

### 7.4 JSONL（.jsonl）——差异化核心之二，QuickLook 的死穴
- **记录流视图**（默认）：每行一条记录，折叠态显示单行摘要，点开展成完整树；左侧行号、可跳行；整列虚拟滚动，几十万行不卡。
- **表格视图**（切换）：自动取所有记录顶层键的并集做列，一行一条记录——适合看 AI 的 trace / 数据集。
- 逐行懒解析；单行坏 JSON 不影响整体（标红该行）。

### 7.5 纯文本兜底
- 未识别类型按纯文本虚拟滚动展示。

## 8. 启动与窗口模型

### 8.0 Repo-root 自动发现（树根钉定）
- **发现算法**：从目标路径逐级向上扫描标记目录/文件，命中即钉为 repo root。
  - 优先级：`.git` > `.hg` / `.svn` > 工程清单（`package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` / `pom.xml` 等）> `.claude` > `README.md`。
  - 策略：**最近的 `.git` 祖先**优先；无 `.git` 则取最近一个含任意标记的祖先；都无则回退为传入目录本身。
- **树根钉在 repo root**：`peek <repo 内任意文件>` 时，树根设为发现的 repo root，并在树中自动展开/高亮到该文件。
- 用户仍可在树中向上"逃出" repo root 浏览外部目录（不与"项目内+外导航"冲突）。
- CLI 在启动时解析 repo root，并以 `?root=<repoRoot>&path=<target>` 传给前端；前端据此渲染树根与计算相对路径。

### 8.1 命令与窗口
- `peek .` → 当前目录所在 repo 的 root 为树根；`peek a.jsonl` → 钉定其 repo root 并定位该文件；`peek ~/任意/目录` → 该目录（或其 repo root）。
- **服务复用**：首次启动起服务并把端口写入锁文件（如 `~/.peek/port`），之后 `peek` 复用同一服务 + 新开窗口 = 瞬开。
- **专属窗口**：优先用 Chromium 系浏览器 `--app=http://127.0.0.1:<port>/?path=...` 开**无浏览器边框**独立窗口；仅有 Safari 时退化为普通标签页。
- **复制**：`navigator.clipboard`（localhost 属安全上下文，`Cmd/Ctrl+C` 原生可用）。

## 9. 大文件策略

- 服务端分块/流式读，避免整文件入内存。
- 前端仅对可视窗口做高亮；代码超阈值退化纯文本。
- JSONL 永远逐行懒解析、虚拟滚动。

## 10. 主题 / 美观

- 默认深色，配色对齐 Dark Modern；UI 整体走简洁的 IDE 风（深色侧栏 + 内容区）。
- 浅色主题留作 v2（跟随系统外观）。

## 11. v1 范围 vs 以后

- **v1**：第 3 节目标全部。
- **v2 候选**：文件内搜索、浅色/跟随系统主题、Mermaid/KaTeX、图片预览、tab 多开、最近目录、Tauri 外壳升级为真 `.app`。

## 12. 假设与待确认（Assumption Ledger）

| 假设 | 置信度 | 错的影响 | 状态 |
|---|---|---|---|
| 只读 viewer，不做编辑 | high | high | 已与用户确认 |
| CLI 启动为主入口 | high | high | 已与用户确认 |
| macOS 优先（Tahoe/arm64） | high | medium | 已与用户确认 |
| 大文件需虚拟化/流式 | medium | medium | 架构师默认采纳 |
| 专属浏览器窗口即可满足"独立感"（不必真 .app） | medium | medium | 已与用户确认（选 A） |
| 前端框架 React、运行时 Node | high | medium | 已与用户确认 |
| 树根默认钉在 repo root，`.git` 优先，可向上逃出 | high | medium | 已与用户确认（用户主动提出） |
| 相对路径 = 相对发现的 repo root | high | medium | 已与用户确认 |
