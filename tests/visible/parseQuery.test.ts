import { describe, it, expect } from 'vitest';
import { parseQuery } from '../../src/server/http/parseQuery';

describe('parseQuery', () => {
  it('parseQuery_happy_path_single_param', () => {
    /**
     * Basic URL with a single query parameter whose value contains a slash.
     * pathname should be the path portion; params.path should be decoded.
     */
    const result = parseQuery('/api/dir?path=/a/b');
    expect(result).toEqual({ pathname: '/api/dir', params: { path: '/a/b' } });
  });

  it('parseQuery_no_query_string', () => {
    /**
     * URL with no query string at all — params should be an empty object,
     * not undefined or null.
     */
    const result = parseQuery('/some/path');
    expect(result).toEqual({ pathname: '/some/path', params: {} });
  });

  it('parseQuery_root_path', () => {
    /**
     * The root path '/' with no query should return pathname='/' and params={}.
     */
    const result = parseQuery('/');
    expect(result).toEqual({ pathname: '/', params: {} });
  });
});
