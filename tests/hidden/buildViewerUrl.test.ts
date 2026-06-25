import { describe, it, expect } from 'vitest';
import { buildViewerUrl } from '../../src/cli/buildViewerUrl';

describe('buildViewerUrl (hidden comprehensive)', () => {
  // ── Happy path: plain paths ──────────────────────────────────────────────

  it('buildViewerUrl_plain_path_correct_full_url', () => {
    /**
     * Verifies the complete URL structure including protocol, host, port,
     * path query parameter, and correct encoding of a simple path.
     */
    const result = buildViewerUrl(3000, '/projects/src/main.ts');
    expect(result).toBe('http://127.0.0.1:3000/?path=%2Fprojects%2Fsrc%2Fmain.ts');
  });

  it('buildViewerUrl_different_valid_port', () => {
    /**
     * Port value is reflected verbatim in the URL host portion.
     */
    const result = buildViewerUrl(9999, '/var/log/app.log');
    expect(result).toBe('http://127.0.0.1:9999/?path=%2Fvar%2Flog%2Fapp.log');
  });

  it('buildViewerUrl_port_1_minimum_positive_integer', () => {
    /**
     * port=1 is the smallest positive integer and must be accepted.
     */
    const result = buildViewerUrl(1, '/data/file.json');
    expect(result).toBe('http://127.0.0.1:1/?path=%2Fdata%2Ffile.json');
  });

  // ── Path encoding: spaces ────────────────────────────────────────────────

  it('buildViewerUrl_path_with_spaces_encoded_as_percent20', () => {
    /**
     * Spaces must be encoded as %20 (encodeURIComponent behaviour).
     */
    const absPath = '/my docs/read me.txt';
    const result = buildViewerUrl(4000, absPath);
    expect(result).toBe(`http://127.0.0.1:4000/?path=${encodeURIComponent(absPath)}`);
    // Confirm %20 appears (not '+')
    expect(result).toContain('%20');
  });

  // ── Path encoding: Chinese / non-ASCII ──────────────────────────────────

  it('buildViewerUrl_path_with_chinese_characters_encoded', () => {
    /**
     * Non-ASCII characters (Chinese) must be percent-encoded via encodeURIComponent.
     * Verified by round-tripping with decodeURIComponent.
     */
    const absPath = '/projects/文档/说明.md';
    const result = buildViewerUrl(5000, absPath);
    const prefix = 'http://127.0.0.1:5000/?path=';
    expect(result.startsWith(prefix)).toBe(true);
    const encodedPart = result.slice(prefix.length);
    expect(decodeURIComponent(encodedPart)).toBe(absPath);
  });

  // ── Path encoding: special URL metacharacters ────────────────────────────

  it('buildViewerUrl_path_with_question_mark_encoded', () => {
    /**
     * '?' in absPath must be encoded as %3F so it does not break the query string.
     */
    const absPath = '/data/query?file.ts';
    const result = buildViewerUrl(3000, absPath);
    expect(result).toBe(`http://127.0.0.1:3000/?path=${encodeURIComponent(absPath)}`);
    expect(result).toContain('%3F');
  });

  it('buildViewerUrl_path_with_ampersand_encoded', () => {
    /**
     * '&' in absPath must be encoded as %26 so it does not introduce extra query params.
     */
    const absPath = '/data/a&b.txt';
    const result = buildViewerUrl(3000, absPath);
    expect(result).toBe(`http://127.0.0.1:3000/?path=${encodeURIComponent(absPath)}`);
    expect(result).toContain('%26');
  });

  it('buildViewerUrl_path_with_hash_encoded', () => {
    /**
     * '#' in absPath must be encoded as %23 so it does not become a URL fragment.
     */
    const absPath = '/data/file#1.ts';
    const result = buildViewerUrl(3000, absPath);
    expect(result).toBe(`http://127.0.0.1:3000/?path=${encodeURIComponent(absPath)}`);
    expect(result).toContain('%23');
  });

  // ── Path encoding: round-trip verification ───────────────────────────────

  it('buildViewerUrl_decode_path_param_round_trips_to_original', () => {
    /**
     * Extracting and decoding the path= param must yield back the original absPath exactly.
     */
    const absPath = '/var/data/report 2024 (final).json';
    const result = buildViewerUrl(7000, absPath);
    const prefix = 'http://127.0.0.1:7000/?path=';
    expect(result.startsWith(prefix)).toBe(true);
    const encoded = result.slice(prefix.length);
    expect(decodeURIComponent(encoded)).toBe(absPath);
  });

  // ── Error cases: invalid port ────────────────────────────────────────────

  it('buildViewerUrl_port_zero_throws_error', () => {
    /**
     * port=0 is not a positive integer; must throw Error.
     */
    expect(() => buildViewerUrl(0, '/projects/file.ts')).toThrow(Error);
  });

  it('buildViewerUrl_negative_port_throws_error', () => {
    /**
     * Negative port values are not positive integers; must throw Error.
     */
    expect(() => buildViewerUrl(-1, '/projects/file.ts')).toThrow(Error);
  });

  it('buildViewerUrl_large_negative_port_throws_error', () => {
    /**
     * Large negative port must also throw Error.
     */
    expect(() => buildViewerUrl(-8080, '/data/x.txt')).toThrow(Error);
  });

  it('buildViewerUrl_fractional_port_throws_error', () => {
    /**
     * A non-integer (e.g. 3000.5) is not a valid port; must throw Error.
     */
    expect(() => buildViewerUrl(3000.5, '/projects/file.ts')).toThrow(Error);
  });

  it('buildViewerUrl_nan_port_throws_error', () => {
    /**
     * NaN is not a positive integer; must throw Error.
     */
    expect(() => buildViewerUrl(NaN, '/projects/file.ts')).toThrow(Error);
  });
});
