import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { FastifyRequest } from 'fastify';
import type { AuthPrincipal } from '../../auth/auth.types';

/**
 * Rate limiting keyed on the account, not the socket.
 *
 * The default `ThrottlerGuard` buckets by IP address, which is the right
 * default for an API browsers call directly and the wrong one for this
 * deployment. Every browser request reaches this service through the web app's
 * route handler (`apps/web/src/app/api/{gov,backend}/[...path]`), so it arrives
 * from the web host's address — a handful of IPs for the entire user base.
 * Bucketing on that means one busy officer exhausts the limit for every other
 * officer in the state, and the first symptom is a workspace that will not
 * load. That is not hypothetical: it is what this guard was written in response
 * to.
 *
 * So: an authenticated request is tracked by its user id, and only an
 * unauthenticated one falls back to the address. The fallback is what still
 * protects `/auth/login` and `/auth/otp/request`, which have no user yet and
 * are the endpoints an attacker actually wants — those are exactly the requests
 * where the IP is the only identity available, and where a shared bucket across
 * one corporate NAT is an acceptable cost.
 *
 * `trustProxy` is already on in `bootstrap.ts`, so `request.ip` is the
 * forwarded client address rather than the load balancer's.
 */
@Injectable()
export class PrincipalThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as FastifyRequest & { user?: AuthPrincipal };
    const userId = request.user?.userId;
    return userId ? `user:${userId}` : `ip:${request.ip}`;
  }
}
