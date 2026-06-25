import { describe, it, expect } from 'vitest';
import { summarizeRecord } from '../../src/shared/jsonView';

describe('summarizeRecord (hidden)', () => {
  // --- Happy path: basic scalar types ---

  it('summarizeRecord_null', () => {
    // null serializes to the literal string 'null'.
    expect(summarizeRecord(null)).toBe('null');
  });

  it('summarizeRecord_boolean_true', () => {
    expect(summarizeRecord(true)).toBe('true');
  });

  it('summarizeRecord_boolean_false', () => {
    expect(summarizeRecord(false)).toBe('false');
  });

  it('summarizeRecord_number_zero', () => {
    expect(summarizeRecord(0)).toBe('0');
  });

  it('summarizeRecord_string_value', () => {
    // Strings are JSON-stringified, so they acquire surrounding quotes.
    expect(summarizeRecord('hi')).toBe('"hi"');
  });

  it('summarizeRecord_array', () => {
    expect(summarizeRecord([1, 2, 3])).toBe('[1,2,3]');
  });

  it('summarizeRecord_nested_object', () => {
    expect(summarizeRecord({ x: { y: 1 } })).toBe('{"x":{"y":1}}');
  });

  // --- undefined and function: JSON.stringify returns undefined, fall back to String() ---

  it('summarizeRecord_undefined_value', () => {
    // JSON.stringify(undefined) === undefined (not a string), so String(undefined) = 'undefined'.
    expect(summarizeRecord(undefined)).toBe('undefined');
  });

  it('summarizeRecord_function_value', () => {
    // JSON.stringify(() => {}) === undefined, so String(() => {}) is used.
    const fn = () => {};
    const result = summarizeRecord(fn);
    expect(result).toBe(String(fn));
  });

  // --- Circular reference ---

  it('summarizeRecord_circular_reference', () => {
    // Circular references cause JSON.stringify to throw; result must be '[unserializable]'.
    const o: Record<string, unknown> = {};
    o['self'] = o;
    expect(summarizeRecord(o)).toBe('[unserializable]');
  });

  // --- Truncation: default maxLen = 120 ---

  it('summarizeRecord_exactly_at_default_maxlen_not_truncated', () => {
    // A JSON representation of exactly 120 chars must NOT be truncated.
    // Build a string whose JSON encoding (with surrounding quotes) is exactly 120 chars.
    // JSON.stringify('x'.repeat(118)) === '"' + 'x'.repeat(118) + '"' = 120 chars.
    const s = 'x'.repeat(118);
    const result = summarizeRecord(s);
    expect(result).toBe(JSON.stringify(s));
    expect(Array.from(result).length).toBe(120);
    expect(result.endsWith('…')).toBe(false);
  });

  it('summarizeRecord_one_over_default_maxlen_truncated', () => {
    // A JSON representation of 121 chars must be truncated to 120 chars ending in '…'.
    // JSON.stringify('x'.repeat(119)) = 121 chars.
    const s = 'x'.repeat(119);
    const result = summarizeRecord(s);
    expect(Array.from(result).length).toBe(120);
    expect(result.endsWith('…')).toBe(true);
  });

  it('summarizeRecord_long_string_truncation_content', () => {
    // Verify the prefix before '…' equals the first 119 chars of the full JSON string.
    const longStr = 'a'.repeat(200);
    const full = JSON.stringify(longStr); // 202 chars
    const result = summarizeRecord(longStr);
    const chars = Array.from(full);
    const expectedPrefix = chars.slice(0, 119).join('');
    expect(result).toBe(expectedPrefix + '…');
  });

  // --- Truncation: custom small maxLen ---

  it('summarizeRecord_custom_maxlen_5', () => {
    // maxLen=5: result must be exactly 5 chars (Array.from length), ending with '…'.
    const result = summarizeRecord({ a: 1, b: 2 }, 5);
    expect(Array.from(result).length).toBe(5);
    expect(result.endsWith('…')).toBe(true);
  });

  it('summarizeRecord_custom_maxlen_1', () => {
    // maxLen=1: slice(0, 0) gives empty string, so result is just '…'.
    const result = summarizeRecord({ a: 1 }, 1);
    expect(result).toBe('…');
    expect(Array.from(result).length).toBe(1);
  });

  // --- Unicode / Chinese characters: Array.from counts code points, not code units ---

  it('summarizeRecord_chinese_chars_no_corruption', () => {
    // An object with Chinese values should round-trip through JSON without corruption
    // when it fits within maxLen.
    const obj = { name: '中文' };
    const expected = JSON.stringify(obj); // '{"name":"中文"}'
    const result = summarizeRecord(obj);
    expect(result).toBe(expected);
  });

  it('summarizeRecord_chinese_truncation_counts_codepoints', () => {
    // Build a JSON string that is just over maxLen=10 in code-point count with Chinese chars.
    // Each Chinese char is 1 code point. A string of 9 Chinese chars:
    // JSON.stringify('中'.repeat(9)) = '"' + '中'.repeat(9) + '"' = 11 chars (code points).
    // With maxLen=10: result must be 10 code points, ending with '…'.
    const s = '中'.repeat(9);
    const result = summarizeRecord(s, 10);
    expect(Array.from(result).length).toBe(10);
    expect(result.endsWith('…')).toBe(true);
  });

  it('summarizeRecord_emoji_truncation_counts_codepoints', () => {
    // Emoji are represented as surrogate pairs in JS strings (2 code units, 1 code point).
    // Array.from correctly counts them as 1 code point each.
    // JSON.stringify('😀'.repeat(5)) = '"😀😀😀😀😀"' = 7 code points.
    // maxLen=5: result must be 5 code points (Array.from length), ending in '…'.
    const s = '😀'.repeat(5);
    const result = summarizeRecord(s, 5);
    expect(Array.from(result).length).toBe(5);
    expect(result.endsWith('…')).toBe(true);
  });

  // --- Value exactly equals maxLen: no truncation ---

  it('summarizeRecord_value_fits_exactly_custom_maxlen', () => {
    // '42' is 2 chars; with maxLen=2 it must NOT be truncated.
    const result = summarizeRecord(42, 2);
    expect(result).toBe('42');
    expect(result.endsWith('…')).toBe(false);
  });
});
