import { createHash } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, catchError, from, of, switchMap, tap, throwError } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { ProblemCode, ProblemException } from '../errors/problem';
import type { AuthPrincipal } from '../../auth/auth.types';

/** How long a key is honoured. Long enough for a retry, short enough to prune. */
const TTL_MS = 24 * 60 * 60 * 1000;

/** `statusCode` while the handler is still running. No response is a 0. */
const IN_FLIGHT = 0;

/**
 * Makes a mutating request happen at most once per `Idempotency-Key`.
 *
 * `apps/web/src/app/api/gov/[...path]/route.ts` has forwarded this header since
 * the proxy was written and nothing read it, so a double-tapped submit on a bad
 * connection filed the report twice — and committed a department's budget twice,
 * which is a corrupt book rather than a duplicate row.
 *
 * The contract:
 *
 *   - No header: nothing happens. It is opt-in per request, because most
 *     mutations are naturally idempotent or harmless to repeat.
 *   - First request: runs, and the response is stored against the key.
 *   - Repeat with the same body: the stored response is replayed with its
 *     original status and an `Idempotency-Replayed: true` header.
 *   - Repeat with a *different* body: 409. Reusing a key for another request is
 *     a client bug, and replaying the first response would hide it.
 *   - Repeat while the first is still running: 409, and the client retries.
 *   - Failures release the key, so a 500 that a retry would fix stays retryable.
 *
 * **The key is reserved before the handler runs, not after.** The obvious
 * implementation — run the handler, then record the key — has a window between
 * those two steps in which a second request sees no record and runs the handler
 * again. That is not theoretical: the e2e spec sends two approvals back to back
 * over loopback and the second one beat the write every time. A unique index on
 * (subject, key) prevents two *records*; only reserving first prevents two
 * *executions*, and it is executions that spend a budget.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Idempotency');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<FastifyRequest & { user?: AuthPrincipal }>();
    const reply = http.getResponse<FastifyReply>();

    const key = headerValue(req.headers['idempotency-key']);
    if (!key) return next.handle();

    if (key.length < 8 || key.length > 200) {
      throw new ProblemException(
        HttpStatus.BAD_REQUEST,
        ProblemCode.VALIDATION_FAILED,
        'Idempotency-Key must be between 8 and 200 characters. A UUID is the usual choice.',
      );
    }

    const subject = req.user?.userId ?? 'anonymous';
    const method = req.method;
    const path = req.url.split('?')[0];
    const fingerprint = fingerprintOf(method, path, req.body);

    return from(this.reserve({ subject, key, fingerprint, method, path })).pipe(
      switchMap((reservation) => {
        if (reservation.kind === 'replay') {
          void reply.header('Idempotency-Replayed', 'true');
          void reply.status(reservation.statusCode);
          return of(reservation.response);
        }

        return next.handle().pipe(
          tap((body) => {
            void this.complete(reservation.id, reply.statusCode ?? 200, body);
          }),
          catchError((error: unknown) => {
            // The handler failed, so nothing happened and the key should not
            // be burned. Releasing it is what keeps a transient 500 retryable.
            void this.release(reservation.id);
            return throwError(() => error);
          }),
        );
      }),
    );
  }

  /**
   * Claim the key, or discover who already has it.
   *
   * The INSERT is the lock: exactly one concurrent request can create the row,
   * and everybody else lands in the unique-violation branch.
   */
  private async reserve(args: {
    subject: string;
    key: string;
    fingerprint: string;
    method: string;
    path: string;
  }): Promise<
    { kind: 'owned'; id: string } | { kind: 'replay'; statusCode: number; response: unknown }
  > {
    try {
      const created = await this.prisma.idempotencyRecord.create({
        data: {
          ...args,
          statusCode: IN_FLIGHT,
          response: {},
          expiresAt: new Date(Date.now() + TTL_MS),
        },
        select: { id: true },
      });
      return { kind: 'owned', id: created.id };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }

    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { subject_key: { subject: args.subject, key: args.key } },
    });

    // Vanished between the failed insert and this read: it expired or was
    // released. Treat the key as free and let the caller retry.
    if (!existing) {
      throw new ProblemException(
        HttpStatus.CONFLICT,
        ProblemCode.CONFLICT,
        'That Idempotency-Key was in use a moment ago. Retry the request.',
      );
    }

    if (existing.fingerprint !== args.fingerprint) {
      throw new ProblemException(
        HttpStatus.CONFLICT,
        ProblemCode.CONFLICT,
        'This Idempotency-Key was already used for a different request. Generate a new key per distinct operation.',
      );
    }

    if (existing.statusCode === IN_FLIGHT) {
      throw new ProblemException(
        HttpStatus.CONFLICT,
        ProblemCode.CONFLICT,
        'A request with this Idempotency-Key is still being processed. Retry in a moment.',
      );
    }

    return { kind: 'replay', statusCode: existing.statusCode, response: existing.response };
  }

  private async complete(id: string, statusCode: number, body: unknown): Promise<void> {
    try {
      await this.prisma.idempotencyRecord.update({
        where: { id },
        data: { statusCode, response: (body ?? null) as never },
      });
    } catch (error) {
      // The work is done and the caller has its answer. A key that cannot be
      // completed means a retry re-runs the handler, which is worth a log line
      // and not worth failing a request that succeeded.
      this.logger.warn(`could not record the idempotency response: ${String(error)}`);
    }
  }

  private async release(id: string): Promise<void> {
    try {
      await this.prisma.idempotencyRecord.delete({ where: { id } });
    } catch (error) {
      this.logger.warn(`could not release the idempotency key: ${String(error)}`);
    }
  }
}

function headerValue(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

/**
 * A stable hash of what was asked for. Key order in the body is normalised, so
 * a client that serialises the same object differently still gets a replay.
 */
export function fingerprintOf(method: string, path: string, body: unknown): string {
  return createHash('sha256')
    .update(`${method} ${path} ${stableStringify(body)}`)
    .digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
  return `{${entries.join(',')}}`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'
  );
}
