import { describe, it, expect } from 'vitest';
import { summarizeRecord } from '../../src/shared/jsonView';

describe('summarizeRecord (visible)', () => {
  it('summarizeRecord_plain_object', () => {
    // A simple object should be JSON-stringified as-is when within default maxLen.
    const result = summarizeRecord({ a: 1, b: 2 });
    expect(result).toBe('{"a":1,"b":2}');
  });

  it('summarizeRecord_number', () => {
    // A plain number should serialize to its string representation.
    expect(summarizeRecord(42)).toBe('42');
  });

  it('summarizeRecord_truncates_long_string', () => {
    // A value whose JSON representation exceeds maxLen should be truncated to
    // (maxLen - 1) visible chars + '…', measured by Array.from (Unicode-safe).
    const longStr = 'x'.repeat(200);
    const result = summarizeRecord(longStr, 20);
    expect(Array.from(result).length).toBe(20);
    expect(result.endsWith('…')).toBe(true);
  });
});
