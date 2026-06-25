import { describe, it, expect } from 'vitest';
import { parseArgs } from '../../src/cli/parseArgs';

describe('parseArgs', () => {
  it('parseArgs_empty_array_returns_dot', () => {
    // No args at all → default '.'
    expect(parseArgs([])).toEqual({ target: '.' });
  });

  it('parseArgs_only_single_dash_flag_returns_dot', () => {
    // Single-dash flag only, no positional arg → default '.'
    expect(parseArgs(['-v'])).toEqual({ target: '.' });
  });

  it('parseArgs_only_double_dash_flag_returns_dot', () => {
    // Double-dash flag only, no positional arg → default '.'
    expect(parseArgs(['--verbose'])).toEqual({ target: '.' });
  });

  it('parseArgs_multiple_flags_only_returns_dot', () => {
    // Multiple flags, still no positional arg → default '.'
    expect(parseArgs(['-v', '--output', '--dry-run'])).toEqual({ target: '.' });
  });

  it('parseArgs_single_relative_path_returns_it', () => {
    // Relative path is used directly as target
    expect(parseArgs(['src/index.ts'])).toEqual({ target: 'src/index.ts' });
  });

  it('parseArgs_tilde_path_returns_it', () => {
    // '~/x' starts with '~' not '-', so it counts as a positional arg
    expect(parseArgs(['~/x'])).toEqual({ target: '~/x' });
  });

  it('parseArgs_flag_before_path_returns_path', () => {
    // Flag precedes positional arg; positional is target
    expect(parseArgs(['--foo', 'y'])).toEqual({ target: 'y' });
  });

  it('parseArgs_flag_after_path_returns_path', () => {
    // Flag follows positional arg; first non-flag is still target
    expect(parseArgs(['output.json', '--pretty'])).toEqual({ target: 'output.json' });
  });

  it('parseArgs_multiple_non_flags_takes_first', () => {
    // When multiple positional args exist, first one is target
    expect(parseArgs(['a', 'b'])).toEqual({ target: 'a' });
  });

  it('parseArgs_flags_between_non_flags_takes_first_non_flag', () => {
    // Flags interspersed; first positional arg wins
    expect(parseArgs(['--foo', 'first', '--bar', 'second'])).toEqual({ target: 'first' });
  });

  it('parseArgs_dot_arg_returns_dot', () => {
    // Explicit '.' as argument → target is '.'
    expect(parseArgs(['.'])).toEqual({ target: '.' });
  });

  it('parseArgs_dotdot_arg_returns_dotdot', () => {
    // '..' is not a flag; it should be used as target
    expect(parseArgs(['..'])).toEqual({ target: '..' });
  });

  it('parseArgs_chinese_path_returns_it', () => {
    // Non-ASCII paths are positional args (no leading '-')
    expect(parseArgs(['项目/源码.ts'])).toEqual({ target: '项目/源码.ts' });
  });

  it('parseArgs_returns_object_with_only_target_key', () => {
    // The returned object shape has exactly { target }
    const result = parseArgs(['some/path']);
    expect(Object.keys(result)).toEqual(['target']);
    expect(result.target).toBe('some/path');
  });

  it('parseArgs_single_dash_alone_returns_dot', () => {
    // A bare '-' starts with '-' so it is treated as a flag, not a path
    expect(parseArgs(['-'])).toEqual({ target: '.' });
  });
});
