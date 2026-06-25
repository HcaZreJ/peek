import { describe, it, expect } from 'vitest';
import { parseJsonSafe } from '../../src/shared/jsonView';

describe('parseJsonSafe', () => {
  // --- Happy path: various valid JSON inputs ---

  it('parseJsonSafe_valid_object', () => {
    /** A plain JSON object should parse to ok:true with the object as value. */
    const result = parseJsonSafe('{"a":1,"b":"two"}');
    expect(result).toEqual({ ok: true, value: { a: 1, b: 'two' } });
  });

  it('parseJsonSafe_valid_array', () => {
    /** A JSON array should parse to ok:true with the array as value. */
    const result = parseJsonSafe('[true, false, null]');
    expect(result).toEqual({ ok: true, value: [true, false, null] });
  });

  it('parseJsonSafe_nested_structure', () => {
    /** Deeply nested JSON should parse fully. */
    const input = '{"a":{"b":{"c":[1,2,3]}}}';
    const result = parseJsonSafe(input);
    expect(result).toEqual({ ok: true, value: { a: { b: { c: [1, 2, 3] } } } });
  });

  it('parseJsonSafe_literal_null', () => {
    /** The string "null" is valid JSON; value should be JavaScript null. */
    const result = parseJsonSafe('null');
    expect(result).toEqual({ ok: true, value: null });
  });

  it('parseJsonSafe_numeric_string', () => {
    /** A bare number is valid JSON; value should be a JS number. */
    const result = parseJsonSafe('123');
    expect(result).toEqual({ ok: true, value: 123 });
  });

  it('parseJsonSafe_boolean_true', () => {
    /** The bare literal "true" is valid JSON. */
    const result = parseJsonSafe('true');
    expect(result).toEqual({ ok: true, value: true });
  });

  it('parseJsonSafe_boolean_false', () => {
    /** The bare literal "false" is valid JSON. */
    const result = parseJsonSafe('false');
    expect(result).toEqual({ ok: true, value: false });
  });

  it('parseJsonSafe_json_string_literal', () => {
    /** A quoted string is valid JSON; value should be the JS string. */
    const result = parseJsonSafe('"hello world"');
    expect(result).toEqual({ ok: true, value: 'hello world' });
  });

  // --- Error cases ---

  it('parseJsonSafe_empty_string', () => {
    /** Empty string must return ok:false (spec error_case). */
    const result = parseJsonSafe('');
    expect(result.ok).toBe(false);
  });

  it('parseJsonSafe_empty_string_error_is_nonempty_string', () => {
    /** The error field for empty input must be a non-empty string. */
    const result = parseJsonSafe('');
    if (!result.ok) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    } else {
      throw new Error('Expected ok:false for empty string');
    }
  });

  it('parseJsonSafe_malformed_object', () => {
    /** Unquoted keys are not valid JSON; should return ok:false. */
    const result = parseJsonSafe('{bad}');
    expect(result.ok).toBe(false);
  });

  it('parseJsonSafe_malformed_error_is_nonempty_string', () => {
    /** error field for invalid JSON must be a non-empty string. */
    const result = parseJsonSafe('{bad}');
    if (!result.ok) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    } else {
      throw new Error('Expected ok:false for malformed input');
    }
  });

  it('parseJsonSafe_trailing_comma_object', () => {
    /** Trailing commas are not valid JSON; should return ok:false. */
    const result = parseJsonSafe('{"a":1,}');
    expect(result.ok).toBe(false);
  });

  it('parseJsonSafe_trailing_comma_array', () => {
    /** Trailing commas in arrays are not valid JSON; should return ok:false. */
    const result = parseJsonSafe('[1, 2, 3,]');
    expect(result.ok).toBe(false);
  });

  it('parseJsonSafe_never_throws_on_invalid_input', () => {
    /** The function must never throw regardless of input (spec: permanently not throwing). */
    expect(() => parseJsonSafe('x')).not.toThrow();
  });

  it('parseJsonSafe_never_throws_on_empty_string', () => {
    /** Must not throw even for empty string. */
    expect(() => parseJsonSafe('')).not.toThrow();
  });

  it('parseJsonSafe_never_throws_on_malformed_json', () => {
    /** Must not throw even for deeply malformed input. */
    expect(() => parseJsonSafe('{{{{{]]]')).not.toThrow();
  });

  it('parseJsonSafe_result_shape_ok_true', () => {
    /** Result for valid JSON has exactly { ok: true, value: ... } shape. */
    const result = parseJsonSafe('42');
    expect(result).toHaveProperty('ok', true);
    expect(result).toHaveProperty('value');
  });

  it('parseJsonSafe_result_shape_ok_false', () => {
    /** Result for invalid JSON has exactly { ok: false, error: string } shape. */
    const result = parseJsonSafe('not json');
    expect(result).toHaveProperty('ok', false);
    expect(result).toHaveProperty('error');
    if (!result.ok) {
      expect(typeof result.error).toBe('string');
    }
  });
});
