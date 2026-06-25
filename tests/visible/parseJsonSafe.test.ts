import { describe, it, expect } from 'vitest';
import { parseJsonSafe } from '../../src/shared/jsonView';

describe('parseJsonSafe', () => {
  it('parseJsonSafe_happy_path_object', () => {
    /**
     * Valid JSON object should parse successfully and return ok:true
     * with the parsed value.
     */
    const result = parseJsonSafe('{"key":"value"}');
    expect(result).toEqual({ ok: true, value: { key: 'value' } });
  });

  it('parseJsonSafe_happy_path_array', () => {
    /**
     * Valid JSON array should parse successfully and return ok:true
     * with the parsed array as the value.
     */
    const result = parseJsonSafe('[1, 2, 3]');
    expect(result).toEqual({ ok: true, value: [1, 2, 3] });
  });

  it('parseJsonSafe_empty_string_returns_ok_false', () => {
    /**
     * Empty string is not valid JSON; should return ok:false with a
     * non-empty error string.
     */
    const result = parseJsonSafe('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });
});
