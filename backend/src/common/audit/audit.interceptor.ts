import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';
import type { AuthPrincipal } from '../../auth/auth.types';

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * Records every state-changing request made by an identified caller.
 *
 * This is the *access* log, and it is deliberately a different thing from the
 * problem timeline the workflow services write. Those entries are domain
 * events — "Approved ₹4.8 L from the water budget" — written inside the same
 * transaction as the change they describe, shown to officers, and worth
 * reading. These are one line per mutating request: who, what route, what
 * status. Nobody reads them until something has gone wrong, and then they are
 * the only record of an endpoint nobody thought to instrument.
 *
 * They stay out of each other's way because `/problems/:id/audit` filters on
 * `problemId`, and entries written here carry none. An officer's timeline shows
 * the eleven things that happened to their problem, not the eleven things plus
 * eleven HTTP requests.
 *
 * Two deliberate exclusions:
 *
 *   - Reads. A GET log on this product would be larger than the database and
 *     tells you nothing a state change does not.
 *   - Anonymous callers. Public report intake is the high-volume endpoint here,
 *     and its record is the `citizen_reports` row it creates — logging a second
 *     row naming nobody would double the write cost of the busiest path in the
 *     product to record that somebody, somewhere, filed something.
 *
 * Failures are swallowed. An audit row that cannot be written is worth a log
 * line; it is not worth failing a funding approval that already committed.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditTrail');

  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<FastifyRequest & { user?: AuthPrincipal }>();

    if (!MUTATING.has(req.method)) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const user = req.user;
        if (!user) return;

        const path = req.url.split('?')[0];
        void this.audit
          .record({
            entityType: 'request',
            entityId: path,
            actor: 'Officer',
            actorUserId: user.userId,
            actorName: user.displayName,
            action: `${req.method} ${path}`,
            detail: describe(req.params),
            automated: false,
          })
          .catch((error: unknown) => {
            this.logger.warn(`could not write the access log entry: ${String(error)}`);
          });
      }),
    );
  }
}

/**
 * The route parameters, as a short readable string.
 *
 * Route params only — never the body. A request body on this API carries
 * rejection reasons in a citizen's own words and, on other surfaces, personal
 * detail; an access log is not the place for either, and one that quietly
 * accumulated them would be a disclosure waiting to happen.
 */
function describe(params: unknown): string | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => typeof v === 'string' || typeof v === 'number',
  );
  if (entries.length === 0) return undefined;
  return entries.map(([k, v]) => `${k}=${String(v)}`).join(' ');
}
