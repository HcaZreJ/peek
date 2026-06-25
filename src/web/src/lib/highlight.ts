// Shiki 高亮器单例 + 按需懒加载语言。
// 主题固定 dark-plus 以复刻 VSCode Dark Modern。

import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
  type SpecialLanguage,
} from 'shiki';

// Shiki codeToTokens/codeToHtml 接受的 lang 类型（已加载的 bundled 语言或特殊语言）。
type ShikiLang = BundledLanguage | SpecialLanguage;

export const THEME = 'dark-plus';

// 初始预载的语言集合（覆盖最常见类型 + markdown 代码块）。
const INITIAL_LANGS: BundledLanguage[] = [
  'typescript',
  'javascript',
  'json',
  'markdown',
];

// 扩展名 → Shiki 语言 id。未命中时回退 'text'（纯文本不高亮）。
const EXT_TO_LANG: Record<string, BundledLanguage> = {
  ts: 'typescript',
  tsx: 'tsx',
  cts: 'typescript',
  mts: 'typescript',
  js: 'javascript',
  jsx: 'jsx',
  cjs: 'javascript',
  mjs: 'javascript',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  cs: 'csharp',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  scala: 'scala',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'fish',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  cfg: 'ini',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  html: 'html',
  htm: 'html',
  xml: 'xml',
  vue: 'vue',
  svelte: 'svelte',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
  pl: 'perl',
  pm: 'perl',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  clj: 'clojure',
  hs: 'haskell',
  ml: 'ocaml',
  json: 'json',
  jsonl: 'json',
  ndjson: 'json',
  md: 'markdown',
  markdown: 'markdown',
};

/** 由扩展名解析 Shiki 语言 id；未知 → 'text'。 */
export function langForExt(ext: string): string {
  const normalized = ext.toLowerCase().replace(/^\./, '');
  return EXT_TO_LANG[normalized] ?? 'text';
}

let highlighterPromise: Promise<Highlighter> | null = null;

/** 获取（懒初始化）共享高亮器单例。 */
function getHighlighter(): Promise<Highlighter> {
  if (highlighterPromise === null) {
    highlighterPromise = createHighlighter({
      themes: [THEME],
      langs: INITIAL_LANGS,
    });
  }
  return highlighterPromise;
}

/** 确保某语言已加载；'text' 与未知语言无需加载，返回安全的 'text'。 */
async function ensureLang(highlighter: Highlighter, lang: string): Promise<ShikiLang> {
  if (lang === 'text' || lang === 'plaintext') return 'text';
  if (highlighter.getLoadedLanguages().includes(lang)) return lang as BundledLanguage;
  try {
    await highlighter.loadLanguage(lang as BundledLanguage);
    return lang as BundledLanguage;
  } catch {
    // 语言加载失败（极少见）→ 退回纯文本，避免整个视图崩溃。
    return 'text';
  }
}

/**
 * 把源码高亮为 HTML 字符串（dark-plus 主题）。
 * 高亮失败 → 退回纯文本（已转义）一行行包裹，调用方仍可正常渲染。
 */
export async function highlightToHtml(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();
  const resolved = await ensureLang(highlighter, lang);
  return highlighter.codeToHtml(code, { lang: resolved, theme: THEME });
}

/**
 * 把源码高亮为带 token 的行数组（用于自定义渲染行号 + 虚拟滚动）。
 * 返回每行的 token 列表（含 content 与 color）。
 */
export interface ThemedToken {
  content: string;
  color?: string;
}

export async function highlightToLines(
  code: string,
  lang: string,
): Promise<ThemedToken[][]> {
  const highlighter = await getHighlighter();
  const resolved = await ensureLang(highlighter, lang);
  const result = highlighter.codeToTokens(code, { lang: resolved, theme: THEME });
  return result.tokens.map((line) =>
    line.map((token) => ({ content: token.content, color: token.color })),
  );
}
