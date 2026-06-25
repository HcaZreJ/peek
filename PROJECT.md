# PROJECT

## 目的
让"偶尔需要人眼查看文件"这件事在 CLI 原生工作流里变得轻量、美观、便捷——补上 TUI 难用、IDE 过重、QuickLook 寄生于 Finder 且看不了 JSON/JSONL 的缺口。

## 核心理念
- **只读**：不做编辑器。改代码交给 AI。
- **CLI 启动**：`peek .` / `peek a.jsonl`，契合"在 CLI 里和 AI 协作"的范式。
- **Repo 感知**：自动发现 repo root 并钉为树根；复制相对 repo root 的路径（最适合喂给 AI）。
- **轻量瞬开**：服务复用，二次打开无冷启。

## 功能清单与状态
| 功能 | 状态 |
|---|---|
| 设计文档 | ✅ 完成 |
| 项目骨架 + 治理文档 | ✅ 完成 |
| 函数级分解 plan | ✅ 完成 |
| 17 核心函数 TDD（344 测试） | ✅ 完成 |
| /review-impl 审查 + 修复（流式 jsonl / XSS 转义 / 参数上限 / 静态边界） | ✅ 完成 |
| Repo-root 自动发现 | ✅ 完成 |
| Server: 目录列举 / 文件读取(分块) / 元数据 / file-kind 探测 | ✅ 完成 |
| Server: JSONL 行区间读取 | ✅ 完成 |
| Server: 静态托管 + 127.0.0.1 绑定 + 路径安全 | ✅ 完成 |
| CLI: 参数解析 / server 发现与启动 / 端口锁 / 开 --app 窗口 | ✅ 完成 |
| Web: 文件树 + 面包屑导航（含逃出 repo root） | ✅ 完成 |
| Web: 代码高亮（Shiki + Dark Modern） | ✅ 完成 |
| Web: Markdown 预览 | ✅ 完成 |
| Web: JSON 折叠树 + 格式化切换 | ✅ 完成 |
| Web: JSONL 记录流 + 表格视图 | ✅ 完成 |
| Web: 复制四件套 | ✅ 完成 |
| Web: 纯文本兜底 + 大文件虚拟滚动 | ✅ 完成 |

## Roadmap
- **v1**：上表全部。
- **v2 候选**：文件内搜索、浅色/跟随系统主题、Mermaid/KaTeX、图片预览、多 tab、最近目录、Tauri 升级为真 `.app`。

## 核心 Data Model（概览）
- `DirEntry { name, path, type:'dir'|'file', size, mtime, ext }`
- `FileMeta { path, size, mtime, ext, kind:'code'|'markdown'|'json'|'jsonl'|'text'|'binary' }`
- `RepoRootInfo { repoRoot, marker }`
- 渲染层按 `kind` 分派到对应组件。

> 详细字段以 `src/shared/types.ts` 与 plan 中的函数 spec 为准。

## 关键决策记录
- 外壳选 A（本地 web app + CLI），与 Tauri 共享前端，预留平滑升级路。
- 命令名 `peek`（避开 vim 的 `view` 别名冲突）。
- 高亮用 Shiki 以精确复刻 VSCode Dark Modern。
- 项目位于 `~/Documents/peek`（`~/Documents` 非 git 仓库，无嵌套冲突）。

## 已知问题 / 下一步（用户反馈 2026-06-25）

1. **CodeView 行号对齐 bug**（优先）：行号与代码挤在一起、未在固定宽度 gutter 内右对齐，导致如「行 54 + 内容 "1." 」渲染成 `541.`。需修：等宽固定列 + 右对齐 + 行号与代码间留间隔。
2. **文件树自动 repo-root**：导航时应自动随路径识别所进入的 project repo，并把树根动态切到该 repo root（当前从 `/tmp` 等非 repo 起点打开时，树从 home 一路展开很臃肿）。期望：跳转到某 repo 内即把展示根收敛到该 repo root。
3. **「跳到外层路径」图标**：加一个 folder-with-up-arrow 图标按钮替代/补充当前的文字版「↑ 上级目录」。

> 这些为用户明确同意"后续再改"的项；不阻塞首个 commit。
