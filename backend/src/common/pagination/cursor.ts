import { z } from 'zod';
import { ProblemException } from '../errors/problem';

/**
 * Opaque cursor pagination, used by every list endpoint.
 *
 * The cursor is a base64url-encoded `{ id, createdAt }` of the last row seen.
 * Clients treat it as opaque; they only ever echo back `page.nextCursor`.
 * Keyset pagination (not OFFSET) so deep pages stay cheap and rows don't shift
 * under a scrolling client.
 */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 25;

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Cursor {
  id: string;
  createdAt: string;
}

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | undefined): Cursor | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown;
    const shape = z.object({ id: z.string(), createdAt: z.string() });
    return shape.parse(parsed);
  } catch {
    throw ProblemException.badRequest('Malformed pagination cursor.', {
      cursor: ['not a valid cursor'],
    });
  }
}

export interface Page<T> {
  data: T[];
  page: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

/**
 * Given `limit + 1` rows fetched from the store, split off the extra row and
 * build the response envelope.
 */
export function buildPage<T extends { id: string; createdAt: Date }>(
  rows: T[],
  limit: number,
): Page<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data.at(-1);
  return {
    data,
    page: {
      limit,
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeCursor({ id: last.id, createdAt: last.createdAt.toISOString() })
          : null,
    },
  };
}
