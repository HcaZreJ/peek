# PATTERNS

项目级设计范式。所有 `@test-author` / `@function-implementer` 必须遵循。

## 模块边界（DEPS 心智）
- `src/web/**` **禁止** import `src/server/**` 或 `src/cli/**`，反之亦然。
- 跨端只共享 `src/shared/**`（纯类型 + 纯函数，无 Node/DOM 专有 API）。
- Web 取数据只经 `src/web/src/lib/api.ts` 里的 fetch 封装，不在组件里散落 `fetch`。

## 命名与导出约定
- 文件名：camelCase（`fileKind.ts`、`repoRoot.ts`）；React 组件文件 PascalCase（`FileTree.tsx`）。
- 函数：动词开头 camelCase（`discoverRepoRoot`、`listDir`、`detectFileKind`、`sliceJsonlLines`）。
- 类型/接口：PascalCase（`DirEntry`、`FileMeta`、`RepoRootInfo`）。
- React 组件：PascalCase 函数组件 + `Props` 接口（`interface FileTreeProps`）。
- 常量：UPPER_SNAKE（`SERVER_HOST`、`HIGHLIGHT_SIZE_LIMIT`）。

## 函数签名约定
- **纯函数优先**：逻辑函数无副作用、输入→输出确定，便于 hidden test。
- I/O 与逻辑分离：磁盘读取（`fs`）封装在薄 I/O 函数里；解析/判定逻辑做成纯函数单独测试。
  - 例：`detectFileKind(ext: string, sample: string): FileKind`（纯）独立于"读文件头部 sample"的 I/O。
- 错误处理：可预期错误返回**结果对象或抛带 `code` 的 `Error`**（如 `{ code: 'ENOENT' }`），不静默吞。路径越界一律拒绝。
- 异步统一 `async/await` + `Promise`，不混用回调。

## Stub 约定（Interface-First）
- 未实现函数体抛 `throw new Error('NotImplemented')`，保证 stub 阶段测试全 FAIL。
- 签名 + JSDoc（输入/输出/错误）先行，实现后填。

## Server 约定
- 路由 handler：`(req, res, params) => Promise<void>`，统一 JSON 响应封装 `sendJson(res, status, body)`。
- 所有 `path` 参数先经 `normalizeRequestedPath(requested, home)`（展开 ~、规范化、要求绝对）后才落盘；静态托管 `serveStatic` 用带分隔符的前缀检查防目录穿越。
- 仅监听 `127.0.0.1`。

## Web 约定
- 状态：v1 用 React 内置 state + 少量 context（当前文件、repo root、主题）；不引入额外状态库。
- 渲染分派：`<Viewer file>` 根据 `file.kind` 选择 `CodeView/MarkdownView/JsonView/JsonlView/TextView`。
- 大列表（代码行、JSONL 记录）一律走 `@tanstack/react-virtual`。
- 复制：集中在 `CopyMenu`，四个动作复用 `copyToClipboard(text)`（基于 `navigator.clipboard`）。

## 测试约定
- 纯逻辑函数：`tests/visible/<fn>.test.ts` + `tests/hidden/<fn>.test.ts`，断言精确（不靠浮点相等/键序/不稳定字符串）。
- 每个测试独立、无共享可变状态。
- 文件系统相关测试用临时目录 fixture，测试后清理。

## 注释 / 文案
- 面向 agent 的指令文案（spec、拼给 sub-agent 的消息）只写正例，描述期望行为本身。
- 代码注释中文为主，解释"为什么"而非"做了什么"。
