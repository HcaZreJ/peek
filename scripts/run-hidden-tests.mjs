#!/usr/bin/env node
// hidden-test 运行器（vitest 版）。
// 用法：node scripts/run-hidden-tests.mjs <fn>
// 只输出 `PASSED: X/Y test cases`，隐藏用例名、断言细节与报错，
// 使 @function-implementer 无法从 hidden test 反推实现。
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fn = process.argv[2];
if (!fn) {
  console.error('用法：node scripts/run-hidden-tests.mjs <fn>');
  process.exit(2);
}

const root = fileURLToPath(new URL('..', import.meta.url));
const testFile = `tests/hidden/${fn}.test.ts`;
if (!existsSync(`${root}/${testFile}`)) {
  console.error(`未找到 hidden 测试：${testFile}`);
  process.exit(2);
}

// 用 vitest 的 json reporter 拿结构化结果，自己只打印计数。
const res = spawnSync(
  'npx',
  ['vitest', 'run', testFile, '--reporter=json', '--no-color'],
  { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

let total = 0;
let passed = 0;
try {
  // vitest 可能在 json 前后夹杂日志，截取第一个 '{' 到最后一个 '}'。
  const out = res.stdout || '';
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  const report = JSON.parse(out.slice(start, end + 1));
  total = report.numTotalTests ?? 0;
  passed = report.numPassedTests ?? 0;
} catch {
  console.error('运行 hidden 测试失败（无法解析结果）。');
  process.exit(1);
}

console.log(`PASSED: ${passed}/${total} test cases`);
process.exit(passed === total && total > 0 ? 0 : 1);
