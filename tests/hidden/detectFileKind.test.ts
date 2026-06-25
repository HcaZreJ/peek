import { describe, it, expect } from 'vitest';
import { detectFileKind, CODE_EXTS } from '../../src/shared/fileKind';

describe('detectFileKind (hidden comprehensive)', () => {

  // --- Markdown extension mappings ---

  it('detectFileKind_md_without_dot_returns_markdown', () => {
    /** 'md' (no leading dot) must return 'markdown'. */
    expect(detectFileKind('md', '')).toBe('markdown');
  });

  it('detectFileKind_md_with_dot_returns_markdown', () => {
    /** '.md' (with leading dot) must return 'markdown'. */
    expect(detectFileKind('.md', '# Title')).toBe('markdown');
  });

  it('detectFileKind_markdown_ext_returns_markdown', () => {
    /** 'markdown' extension must return 'markdown'. */
    expect(detectFileKind('markdown', 'Some text')).toBe('markdown');
  });

  it('detectFileKind_MD_uppercase_returns_markdown', () => {
    /** Extension matching is case-insensitive: '.MD' must return 'markdown'. */
    expect(detectFileKind('.MD', '# Heading')).toBe('markdown');
  });

  it('detectFileKind_MARKDOWN_uppercase_returns_markdown', () => {
    /** Extension matching is case-insensitive: 'MARKDOWN' must return 'markdown'. */
    expect(detectFileKind('MARKDOWN', '')).toBe('markdown');
  });

  // --- JSON extension mapping ---

  it('detectFileKind_json_without_dot_returns_json', () => {
    /** 'json' (no leading dot) must return 'json'. */
    expect(detectFileKind('json', '{}')).toBe('json');
  });

  it('detectFileKind_json_with_dot_returns_json', () => {
    /** '.json' (with leading dot) must return 'json'. */
    expect(detectFileKind('.json', '[]')).toBe('json');
  });

  it('detectFileKind_JSON_uppercase_returns_json', () => {
    /** Case-insensitive: 'JSON' must return 'json'. */
    expect(detectFileKind('JSON', '{}')).toBe('json');
  });

  // --- JSONL / NDJSON extension mapping ---

  it('detectFileKind_jsonl_without_dot_returns_jsonl', () => {
    /** 'jsonl' must return 'jsonl'. */
    expect(detectFileKind('jsonl', '{"a":1}\n{"b":2}')).toBe('jsonl');
  });

  it('detectFileKind_jsonl_with_dot_returns_jsonl', () => {
    /** '.jsonl' must return 'jsonl'. */
    expect(detectFileKind('.jsonl', '')).toBe('jsonl');
  });

  it('detectFileKind_ndjson_without_dot_returns_jsonl', () => {
    /** 'ndjson' must return 'jsonl'. */
    expect(detectFileKind('ndjson', '{"x":1}')).toBe('jsonl');
  });

  it('detectFileKind_ndjson_with_dot_returns_jsonl', () => {
    /** '.ndjson' must return 'jsonl'. */
    expect(detectFileKind('.ndjson', '')).toBe('jsonl');
  });

  it('detectFileKind_JSONL_uppercase_returns_jsonl', () => {
    /** Case-insensitive: 'JSONL' must return 'jsonl'. */
    expect(detectFileKind('JSONL', '')).toBe('jsonl');
  });

  // --- CODE_EXTS mapping ---

  it('detectFileKind_ts_returns_code', () => {
    /** 'ts' is in CODE_EXTS and must return 'code'. */
    expect(detectFileKind('ts', 'const x = 1;')).toBe('code');
  });

  it('detectFileKind_ts_with_dot_returns_code', () => {
    /** '.ts' (with leading dot) must return 'code'. */
    expect(detectFileKind('.ts', '')).toBe('code');
  });

  it('detectFileKind_TS_uppercase_returns_code', () => {
    /** Case-insensitive: 'TS' must return 'code'. */
    expect(detectFileKind('TS', 'const x = 1;')).toBe('code');
  });

  it('detectFileKind_py_returns_code', () => {
    /** 'py' is in CODE_EXTS and must return 'code'. */
    expect(detectFileKind('py', 'def foo(): pass')).toBe('code');
  });

  it('detectFileKind_tsx_returns_code', () => {
    /** 'tsx' is in CODE_EXTS and must return 'code'. */
    expect(detectFileKind('tsx', '<Component />')).toBe('code');
  });

  it('detectFileKind_css_returns_code', () => {
    /** 'css' is in CODE_EXTS and must return 'code'. */
    expect(detectFileKind('css', 'body { margin: 0; }')).toBe('code');
  });

  it('detectFileKind_html_returns_code', () => {
    /** 'html' is in CODE_EXTS and must return 'code'. */
    expect(detectFileKind('html', '<html></html>')).toBe('code');
  });

  it('detectFileKind_yaml_returns_code', () => {
    /** 'yaml' is in CODE_EXTS and must return 'code'. */
    expect(detectFileKind('yaml', 'key: value')).toBe('code');
  });

  it('detectFileKind_yml_returns_code', () => {
    /** 'yml' is in CODE_EXTS and must return 'code'. */
    expect(detectFileKind('yml', 'key: value')).toBe('code');
  });

  it('detectFileKind_sql_returns_code', () => {
    /** 'sql' is in CODE_EXTS and must return 'code'. */
    expect(detectFileKind('sql', 'SELECT 1')).toBe('code');
  });

  it('detectFileKind_all_CODE_EXTS_members_return_code', () => {
    /** Every member of CODE_EXTS must map to 'code'. */
    for (const ext of CODE_EXTS) {
      expect(detectFileKind(ext, ''), `extension "${ext}" should return 'code'`).toBe('code');
    }
  });

  // --- Fallback to sample: unknown extension ---

  it('detectFileKind_unknown_ext_no_nul_returns_text', () => {
    /** Unknown extension + sample with no NUL byte must return 'text'. */
    expect(detectFileKind('xyz', 'Hello world')).toBe('text');
  });

  it('detectFileKind_unknown_ext_with_nul_returns_binary', () => {
    /** Unknown extension + sample containing NUL byte must return 'binary'. */
    expect(detectFileKind('xyz', 'data\x00more')).toBe('binary');
  });

  it('detectFileKind_unknown_ext_with_dot_no_nul_returns_text', () => {
    /** '.xyz' (with dot) + plain sample must return 'text'. */
    expect(detectFileKind('.xyz', 'plain text here')).toBe('text');
  });

  it('detectFileKind_unknown_ext_with_dot_nul_returns_binary', () => {
    /** '.xyz' (with dot) + NUL-containing sample must return 'binary'. */
    expect(detectFileKind('.xyz', '\x00')).toBe('binary');
  });

  // --- Empty extension falls back to sample ---

  it('detectFileKind_empty_ext_no_nul_returns_text', () => {
    /** Empty string extension + sample without NUL must return 'text'. */
    expect(detectFileKind('', 'just text')).toBe('text');
  });

  it('detectFileKind_empty_ext_with_nul_returns_binary', () => {
    /** Empty string extension + sample containing NUL must return 'binary'. */
    expect(detectFileKind('', 'bytes\x00here')).toBe('binary');
  });

  it('detectFileKind_empty_ext_empty_sample_returns_text', () => {
    /** Empty extension + empty sample (no NUL) must return 'text'. */
    expect(detectFileKind('', '')).toBe('text');
  });

  // --- Empty sample edge cases ---

  it('detectFileKind_unknown_ext_empty_sample_returns_text', () => {
    /** Unknown extension + empty sample (no NUL bytes) must return 'text'. */
    expect(detectFileKind('bin', '')).toBe('text');
  });

  // --- NUL byte placement ---

  it('detectFileKind_nul_at_start_of_sample_returns_binary', () => {
    /** NUL at the very first position of sample must return 'binary'. */
    expect(detectFileKind('dat', '\x00trailing')).toBe('binary');
  });

  it('detectFileKind_nul_at_end_of_sample_returns_binary', () => {
    /** NUL at the very last position of sample must return 'binary'. */
    expect(detectFileKind('dat', 'leading\x00')).toBe('binary');
  });

  // --- Extension priority over sample ---

  it('detectFileKind_md_ext_with_nul_sample_returns_markdown_not_binary', () => {
    /**
     * Extension mapping has highest priority: even if sample contains NUL,
     * a .md extension must still return 'markdown', not 'binary'.
     */
    expect(detectFileKind('.md', 'text\x00binary')).toBe('markdown');
  });

  it('detectFileKind_ts_ext_with_nul_sample_returns_code_not_binary', () => {
    /**
     * Extension mapping has highest priority: even if sample contains NUL,
     * a .ts extension must still return 'code', not 'binary'.
     */
    expect(detectFileKind('.ts', '\x00\x00\x00')).toBe('code');
  });

  it('detectFileKind_json_ext_with_nul_sample_returns_json_not_binary', () => {
    /**
     * Extension mapping has highest priority: '.json' must return 'json'
     * even when sample contains NUL bytes.
     */
    expect(detectFileKind('.json', '\x00')).toBe('json');
  });
});
