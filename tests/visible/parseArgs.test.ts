import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli/parseArgs';

describe('parseArgs', () => {
  it('parseArgs_empty_array_returns_dot', () => {
    // Empty argv → default target is current directory
    expect(parseArgs([])).toEqual({ target: '.' });
  });

  it('parseArgs_single_path_arg_returns_it', () => {
    // A plain path with no leading dash is used as target
    expect(parseArgs(['x.json'])).toEqual({ target: 'x.json' });
  });

  it('parseArgs_flag_before_path_returns_path', () => {
    // Flags (leading '-') are skipped; first non-flag is target
    expect(parseArgs(['--foo', 'y'])).toEqual({ target: 'y' });
  });
});
