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
import { Observable, from, of, switchMap, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { ProblemCode, ProblemException } from '../errors/problem';
import type { AuthPrincipal } from '../../auth/auth.types';

/** How long a key is honoured. Long enough for a retry, short enough to prune. */
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Makes a mutating request happen at most once per `Idempotency-Key`.
 *
 * `apps/web/src/app/api/gov/[...path]/route.ts` has forwarded this header since
 * the proxy was written and nothing read it, so a double-tapped submit on a bad
 * connection files the report twice — and from stage 03 would commit a
 * department budget twice, which is a corrupt book rather than a duplicate row.
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
 *   - Failures are not stored. A 500 that a retry would fix must stay retryable.
 *
 * There is a race — two genuinely simultaneous requests can both pass the
 * lookup — which the unique index on (subject, key) settles: the loser's insert
 * is rejected, and it has already returned its own identical result.
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

    return from(
      this.prisma.idempotencyRecord.findUnique({ where: { subject_key: { subject, key } } }),
    ).pipe(
      switchMap((existing) => {
        if (existing) {
          if (existing.fingerprint !== fingerprint) {
            throw new ProblemException(
              HttpStatus.CONFLICT,
              ProblemCode.CONFLICT,
              'This Idempotency-Key was already used for a different request. Generate a new key per distinct operation.',
            );
          }
          void reply.header('Idempotency-Replayed', 'true');
          void reply.status(existing.statusCode);
          return of(existing.response);
        }

        return next.handle().pipe(
          tap((body) => {
            // Fire and forget: the caller already has its answer, and failing
            // to record the key must not fail a request that succeeded.
            void this.record({ subject, key, fingerprint, method, path, reply, body });
          }),
        );
      }),
    );
  }

  private async record(args: {
    subject: string;
    key: string;
    fingerprint: string;
    method: string;
    path: string;
    reply: FastifyReply;
    body: unknown;
  }): Promise<void> {
    const statusCode = args.reply.statusCode ?? 200;
    if (statusCode >= 400) return;

    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          subject: args.subject,
          key: args.key,
          fingerprint: args.fingerprint,
          method: args.method,
          path: args.path,
          statusCode,
          response: (args.body ?? null) as never,
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      });
    } catch (error) {
      // The unique index rejecting a concurrent insert is the design working,
      // not a fault. Anything else is worth a line in the log.
      if (!isUniqueViolation(error)) {
        this.logger.warn(`could not record idempotency key: ${String(error)}`);
      }
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
