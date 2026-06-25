# DEVFLOW

## 常用命令
| 命令 | 作用 |
|---|---|
| `npm install` | 安装依赖 |
| `npm run dev` | 启动前端 vite dev server（:5319，`/api` 代理到 :5318） |
| `npm run dev:server` | 用 tsx watch 跑后端 server（:5318） |
| `npm run build` | 构建前端(`dist/web`) + 后端(`dist/`) |
| `npm run typecheck` | 全量类型检查（Node 侧 + Web 侧两套 tsconfig） |
| `npm test` | 跑全部单元测试（vitest run） |
| `npm run test:watch` | vitest watch |

## 开发期运行 peek
- 后端：`tsx src/cli/main.ts <path>`（开发期 CLI 直接跑源码；它会拉起 server）。
- 或前后端分离调试：一个终端 `npm run dev:server`，另一个 `npm run dev`，浏览器开 `http://127.0.0.1:5319`。

## 端口约定
- Server：`5318`（仅 `127.0.0.1`）
- Vite dev：`5319`
- 生产运行时端口动态分配，写入锁文件 `~/.peek/port` 供二次启动复用。

## 测试策略（Test-First，双层）
遵循 harness 协议的 test-first 与 visible/hidden 分层，JS 侧用 vitest 落地：
- `tests/visible/<fn>.test.ts` —— 2-3 个样例，`@function-implementer` 可见。
- `tests/hidden/<fn>.test.ts` —— 10+ 全面用例，实现者**不可读源码**；只能通过运行器看通过数。
- 运行器：`node scripts/run-hidden-tests.mjs <fn>` —— 仅输出 `PASSED: X/Y`，不泄露用例/报错。
- Stub 阶段所有测试必须 FAIL（抛 `NotImplemented`）。

> 说明：因本项目为 TS/Node（非 Python），不使用全局 `run-hidden-tests.sh`（pytest 版），改用项目内 `scripts/run-hidden-tests.mjs`（vitest 版），隔离效果一致。

### UI 组件的测试边界（架构师裁定）
纯逻辑/后端函数（repo-root 发现、路径安全、file kind 探测、目录列举、JSONL 行切分、相对路径、server route handler）走完整双层 TDD。React 展示型组件以**集成验收 + 渲染冒烟测试**为主（jsdom），不强行做函数级 hidden test —— 这点在 plan 里逐函数标注，留待用户在 plan 批准环节确认。

## 构建/CI
- 无 CI（个人本地工具）。提交前手动跑 `npm run typecheck && npm test`。
- 提交粒度：plan 级别一个 commit，用户批准后再提交（见全局协议）。

## 手动验收清单
`peek` 实现后用真实文件验收：
- `peek .`（repo 内）→ 树根钉在 repo root
- `peek <deep/file.ts>` → 高亮对齐 Dark Modern，树定位到该文件
- `peek <x.md>` → 渲染预览
- `peek <x.json>`（含压缩单行）→ 折叠树 + 格式化切换
- `peek <x.jsonl>`（多行+坏行）→ 记录流 / 表格视图，坏行标红
- 复制四件套：文件名 / 绝对路径 / 相对 repo root 路径 / 内容
