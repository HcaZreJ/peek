import { describe, it, expect } from 'vitest';
import { buildViewerUrl } from '../../src/cli/buildViewerUrl';

describe('buildViewerUrl (visible samples)', () => {
  it('buildViewerUrl_happy_path_simple_unix_path', () => {
    /**
     * A plain absolute path with no special characters should produce
     * the exact URL: http://127.0.0.1:<port>/?path=<encodeURIComponent(absPath)>
     */
    const result = buildViewerUrl(3000, '/projects/app/index.ts');
    expect(result).toBe('http://127.0.0.1:3000/?path=%2Fprojects%2Fapp%2Findex.ts');
  });

  it('buildViewerUrl_happy_path_path_with_spaces', () => {
    /**
     * Spaces in the path must be percent-encoded via encodeURIComponent.
     */
    const absPath = '/my docs/notes.md';
    const result = buildViewerUrl(8080, absPath);
    expect(result).toBe(`http://127.0.0.1:8080/?path=${encodeURIComponent(absPath)}`);
  });

  it('buildViewerUrl_invalid_port_zero_throws', () => {
    /**
     * port=0 is not a positive integer; the function must throw an Error.
     */
    expect(() => buildViewerUrl(0, '/projects/file.txt')).toThrow(Error);
  });
});
