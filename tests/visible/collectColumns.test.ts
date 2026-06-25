import { describe, it, expect } from 'vitest';
import { collectColumns } from '../../src/shared/jsonView';

describe('collectColumns (visible samples)', () => {
  it('collectColumns_happy_path_union_of_keys_in_order', () => {
    /**
     * Given two objects with overlapping keys, returns the union
     * preserving first-occurrence order with duplicates removed.
     */
    expect(collectColumns([{ a: 1, b: 2 }, { b: 3, c: 4 }])).toEqual(['a', 'b', 'c']);
  });

  it('collectColumns_non_object_records_ignored', () => {
    /**
     * Numbers, strings, and arrays are not plain objects and must be
     * ignored; only keys from plain-object records are collected.
     */
    expect(collectColumns([1, { a: 1 }, 'x', { a: 2, b: 3 }])).toEqual(['a', 'b']);
  });

  it('collectColumns_empty_array_returns_empty', () => {
    /**
     * An empty input array must return an empty column list.
     */
    expect(collectColumns([])).toEqual([]);
  });
});
