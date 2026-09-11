import { describe, expect, it } from 'vitest';
import { durationToSeconds } from '../../../src/auth/token.service';

describe('durationToSeconds', () => {
  it.each([
    ['15m', 900],
    ['30d', 2_592_000],
    ['1h', 3600],
    ['500ms', 1],
    ['45s', 45],
  ])('%s → %i seconds', (input, expected) => {
    expect(durationToSeconds(input)).toBe(expected);
  });

  it('throws on a malformed duration', () => {
    expect(() => durationToSeconds('15 minutes')).toThrow();
  });
});
