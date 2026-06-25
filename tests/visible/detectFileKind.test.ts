import { describe, it, expect } from 'vitest';
import { detectFileKind } from '../../src/shared/fileKind';

describe('detectFileKind (visible samples)', () => {
  it('detectFileKind_markdown_ext_returns_markdown', () => {
    /**
     * A .md extension must map to 'markdown' regardless of sample content.
     */
    expect(detectFileKind('md', '# Hello world')).toBe('markdown');
  });

  it('detectFileKind_json_ext_returns_json', () => {
    /**
     * A .json extension must map to 'json' regardless of sample content.
     */
    expect(detectFileKind('.json', '{"key": "value"}')).toBe('json');
  });

  it('detectFileKind_unknown_ext_with_nul_returns_binary', () => {
    /**
     * When the extension is unknown and the sample contains a NUL byte,
     * the result must be 'binary'.
     */
    expect(detectFileKind('bin', 'some\x00data')).toBe('binary');
  });
});
