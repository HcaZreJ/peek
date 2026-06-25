import { describe, it, expect } from 'vitest';
import { parseQuery } from '../../src/server/http/parseQuery';

describe('parseQuery', () => {
  it('parseQuery_basic_path_param', () => {
    /**
     * Single query parameter whose value is a path containing slashes.
     * Verifies that both pathname and params are extracted correctly.
     */
    const result = parseQuery('/api/dir?path=/a/b');
    expect(result.pathname).toBe('/api/dir');
    expect(result.params).toEqual({ path: '/a/b' });
  });

  it('parseQuery_multiple_params', () => {
    /**
     * URL with two distinct query parameters — both should appear in params.
     */
    const result = parseQuery('/api/file?path=/x&offset=10');
    expect(result.pathname).toBe('/api/file');
    expect(result.params).toEqual({ path: '/x', offset: '10' });
  });

  it('parseQuery_duplicate_key_takes_first', () => {
    /**
     * When the same key appears multiple times, the spec requires the
     * FIRST value to be kept; the second must be discarded.
     */
    const result = parseQuery('/search?q=first&q=second');
    expect(result.pathname).toBe('/search');
    expect(result.params.q).toBe('first');
  });

  it('parseQuery_percent_encoded_slash', () => {
    /**
     * A %2F in the query value must be decoded to the literal '/' character.
     */
    const result = parseQuery('/api?path=%2Fsome%2Fdir');
    expect(result.params.path).toBe('/some/dir');
  });

  it('parseQuery_percent_encoded_space', () => {
    /**
     * %20 in a query value must be decoded to a space character.
     */
    const result = parseQuery('/search?q=hello%20world');
    expect(result.params.q).toBe('hello world');
  });

  it('parseQuery_chinese_encoded_value', () => {
    /**
     * A percent-encoded multi-byte UTF-8 sequence (Chinese characters)
     * must be decoded to the actual Unicode string.
     */
    const encoded = encodeURIComponent('你好');
    const result = parseQuery(`/api?name=${encoded}`);
    expect(result.params.name).toBe('你好');
  });

  it('parseQuery_no_query_string_empty_params', () => {
    /**
     * A URL with no '?' at all must return params as an empty plain object.
     */
    const result = parseQuery('/no/query/here');
    expect(result.pathname).toBe('/no/query/here');
    expect(result.params).toEqual({});
  });

  it('parseQuery_root_slash_no_query', () => {
    /**
     * The minimal URL '/' must return pathname='/' and params={}.
     */
    const result = parseQuery('/');
    expect(result.pathname).toBe('/');
    expect(result.params).toEqual({});
  });

  it('parseQuery_pathname_is_correct_segment', () => {
    /**
     * pathname must contain only the path portion, with no query string
     * leaked into it.
     */
    const result = parseQuery('/deep/path/here?key=val');
    expect(result.pathname).toBe('/deep/path/here');
    expect(result.pathname).not.toContain('?');
  });

  it('parseQuery_hash_fragment_not_in_params', () => {
    /**
     * A '#frag' fragment must not appear in params; the hash is not part
     * of the query string and should be ignored.
     */
    const result = parseQuery('/page?key=value#frag');
    expect(result.params).toEqual({ key: 'value' });
    expect(Object.keys(result.params)).not.toContain('#frag');
    expect(Object.keys(result.params)).not.toContain('frag');
  });

  it('parseQuery_empty_string_input_fallback', () => {
    /**
     * An empty string is not a valid URL segment; the spec requires fallback
     * to { pathname: '/', params: {} } on parse error.
     */
    const result = parseQuery('');
    expect(result).toEqual({ pathname: '/', params: {} });
  });

  it('parseQuery_empty_query_string_no_params', () => {
    /**
     * A URL ending with '?' but no key-value pairs should yield params={}.
     */
    const result = parseQuery('/path?');
    expect(result.pathname).toBe('/path');
    expect(result.params).toEqual({});
  });

  it('parseQuery_params_values_are_strings', () => {
    /**
     * All values in params must be strings, regardless of the content.
     * Numeric-looking values must remain as strings.
     */
    const result = parseQuery('/api?count=42&flag=true');
    expect(typeof result.params.count).toBe('string');
    expect(typeof result.params.flag).toBe('string');
    expect(result.params.count).toBe('42');
    expect(result.params.flag).toBe('true');
  });

  it('parseQuery_plus_sign_in_value_decodes_to_space', () => {
    /**
     * 标准 URLSearchParams 语义：query 中的裸 '+' 解码为空格。
     * peek 的 path 参数上游统一用 encodeURIComponent（'+' → '%2B'），
     * 故不会出现裸 '+'；此处仅锁定标准语义。
     */
    const result = parseQuery('/search?q=a+b');
    expect(result.params.q).toBe('a b');
  });

  it('parseQuery_encoded_plus_preserved', () => {
    /**
     * 真正的 '+' 字符经 %2B 编码后，必须解码回字面 '+'（路径保真）。
     */
    const result = parseQuery('/api?path=%2Fa%2Bb');
    expect(result.params.path).toBe('/a+b');
  });

  it('parseQuery_deeply_nested_path_in_param', () => {
    /**
     * A deeply nested path value passed as query param must be fully decoded.
     */
    const result = parseQuery('/api/dir?path=%2Fa%2Fb%2Fc%2Fd');
    expect(result.params.path).toBe('/a/b/c/d');
  });
});
