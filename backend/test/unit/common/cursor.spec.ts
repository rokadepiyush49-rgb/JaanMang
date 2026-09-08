import { describe, expect, it } from 'vitest';
import { buildPage, decodeCursor, encodeCursor } from '../../../src/common/pagination/cursor';
import { ProblemException } from '../../../src/common/errors/problem';

describe('cursor pagination', () => {
  it('round-trips a cursor', () => {
    const c = { id: 'abc', createdAt: '2026-01-01T00:00:00.000Z' };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it('returns undefined for an absent cursor', () => {
    expect(decodeCursor(undefined)).toBeUndefined();
  });

  it('rejects a malformed cursor with a 400', () => {
    expect(() => decodeCursor('not-base64-json')).toThrow(ProblemException);
  });

  it('splits the sentinel row and emits nextCursor only when there is more', () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({
      id: `id-${i}`,
      createdAt: new Date(2026, 0, i + 1),
    }));
    const page = buildPage(rows, 3);
    expect(page.data).toHaveLength(3);
    expect(page.page.hasMore).toBe(true);
    expect(page.page.nextCursor).toBeTypeOf('string');

    const last = buildPage(rows.slice(0, 2), 3);
    expect(last.page.hasMore).toBe(false);
    expect(last.page.nextCursor).toBeNull();
  });
});
