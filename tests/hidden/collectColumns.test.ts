import { describe, it, expect } from 'vitest';
import { collectColumns } from '../../src/shared/jsonView';

describe('collectColumns (hidden comprehensive)', () => {
  it('collectColumns_empty_array_returns_empty_array', () => {
    /**
     * Empty input must produce an empty column list.
     */
    expect(collectColumns([])).toEqual([]);
  });

  it('collectColumns_single_object_returns_its_keys', () => {
    /**
     * A single plain object yields exactly its own top-level keys.
     */
    expect(collectColumns([{ x: 10, y: 20, z: 30 }])).toEqual(['x', 'y', 'z']);
  });

  it('collectColumns_empty_object_contributes_no_keys', () => {
    /**
     * An empty plain object has no keys, so the result is [].
     */
    expect(collectColumns([{}])).toEqual([]);
  });

  it('collectColumns_multiple_objects_key_union_preserves_first_occurrence_order', () => {
    /**
     * The spec example: [{a,b},{b,c}] → ['a','b','c'].
     * Key 'b' appears in both; it must appear only once, at the position
     * it was first seen (from the first object).
     */
    expect(collectColumns([{ a: 1, b: 2 }, { b: 3, c: 4 }])).toEqual(['a', 'b', 'c']);
  });

  it('collectColumns_duplicate_keys_across_records_deduped', () => {
    /**
     * When the same key appears in many records it must appear once
     * in the output at its first-occurrence position.
     */
    expect(collectColumns([{ k: 1 }, { k: 2 }, { k: 3 }])).toEqual(['k']);
  });

  it('collectColumns_key_order_strictly_first_occurrence', () => {
    /**
     * Keys introduced in later records must appear after all keys
     * introduced by earlier records, in the order they were first seen.
     */
    expect(collectColumns([
      { c: 3, a: 1 },
      { b: 2, a: 9 },
      { d: 4 },
    ])).toEqual(['c', 'a', 'b', 'd']);
  });

  it('collectColumns_null_records_ignored', () => {
    /**
     * null is not a plain object (even though typeof null === 'object')
     * and must be ignored.
     */
    expect(collectColumns([null, { a: 1 }, null])).toEqual(['a']);
  });

  it('collectColumns_array_records_ignored', () => {
    /**
     * Arrays pass the typeof check but Array.isArray() is true, so they
     * must be ignored.
     */
    expect(collectColumns([[1, 2, 3], { a: 1 }, [4, 5]])).toEqual(['a']);
  });

  it('collectColumns_mixed_non_objects_all_ignored', () => {
    /**
     * Numbers, strings, booleans, null, and arrays must all be ignored;
     * result comes only from plain-object records.
     */
    expect(collectColumns([1, 'hello', true, null, [1, 2], { z: 99 }])).toEqual(['z']);
  });

  it('collectColumns_all_non_objects_returns_empty', () => {
    /**
     * When no record is a plain object the result must be [].
     * Spec example: [null, [1,2]] → [].
     */
    expect(collectColumns([null, [1, 2]])).toEqual([]);
  });

  it('collectColumns_chinese_key_names_collected', () => {
    /**
     * Unicode / Chinese key names are valid object keys and must be
     * included just like ASCII keys, preserving first-occurrence order.
     */
    expect(collectColumns([{ 姓名: '张三', 年龄: 30 }, { 城市: '北京', 年龄: 25 }]))
      .toEqual(['姓名', '年龄', '城市']);
  });

  it('collectColumns_spec_example_non_objects_interspersed', () => {
    /**
     * Exact spec example: [1,{a:1},'x',{a:2,b:3}] → ['a','b'].
     */
    expect(collectColumns([1, { a: 1 }, 'x', { a: 2, b: 3 }])).toEqual(['a', 'b']);
  });

  it('collectColumns_three_objects_disjoint_keys_preserves_insertion_order', () => {
    /**
     * When all objects have completely disjoint keys the result is just
     * the concatenation in encounter order.
     */
    expect(collectColumns([{ p: 1 }, { q: 2 }, { r: 3 }])).toEqual(['p', 'q', 'r']);
  });

  it('collectColumns_only_null_and_arrays_returns_empty', () => {
    /**
     * All-non-object input with both null and arrays must yield [].
     */
    expect(collectColumns([null, null, [], [1, 2, 3]])).toEqual([]);
  });
});
