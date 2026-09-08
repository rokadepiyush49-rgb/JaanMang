import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Stable, machine-readable error codes.
 *
 * The web app already keys off strings like these in its council routes
 * (`RATE_LIMITED`, `MISSING_KEY`). Every error the API returns carries one, so a
 * client can branch on `code` without string-matching `detail`.
 */
export const ProblemCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_STATE: 'INVALID_STATE',
  RATE_LIMITED: 'RATE_LIMITED',
  MISSING_CONFIG: 'MISSING_CONFIG',
  UPSTREAM_FAILED: 'UPSTREAM_FAILED',
  INTERNAL: 'INTERNAL',
} as const;

export type ProblemCode = (typeof ProblemCode)[keyof typeof ProblemCode];

/** RFC 9457 problem+json body. */
export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: ProblemCode;
  /** Field-level validation errors, when applicable. */
  errors?: Record<string, string[]>;
  /** Set by the filter from the request. */
  instance?: string;
}

/**
 * The one exception type the app throws for expected failures. The global
 * filter renders any `ProblemException` as `application/problem+json`; anything
 * else becomes a generic 500 with no internal detail leaked.
 */
export class ProblemException extends HttpException {
  constructor(
    status: HttpStatus,
    code: ProblemCode,
    detail: string,
    options?: { title?: string; errors?: Record<string, string[]>; type?: string },
  ) {
    const title = options?.title ?? defaultTitle(status);
    super(
      {
        type: options?.type ?? 'about:blank',
        title,
        status,
        detail,
        code,
        ...(options?.errors ? { errors: options.errors } : {}),
      } satisfies ProblemBody,
      status,
    );
  }

  static badRequest(detail: string, errors?: Record<string, string[]>) {
    return new ProblemException(HttpStatus.BAD_REQUEST, ProblemCode.VALIDATION_FAILED, detail, {
      errors,
    });
  }
  static unauthenticated(
    detail = 'Authentication required.',
    code: ProblemCode = ProblemCode.UNAUTHENTICATED,
  ) {
    return new ProblemException(HttpStatus.UNAUTHORIZED, code, detail);
  }
  static forbidden(detail = 'You do not have permission to do that.') {
    return new ProblemException(HttpStatus.FORBIDDEN, ProblemCode.FORBIDDEN, detail);
  }
  /**
   * Something outside the caller's jurisdiction / organisation. Rendered as 404,
   * not 403 — the existence of a record they cannot see is itself not theirs to
   * know (mirrors `scopeProblems` in apps/web).
   */
  static outOfScope(detail = 'Not found.') {
    return new ProblemException(HttpStatus.NOT_FOUND, ProblemCode.OUT_OF_SCOPE, detail, {
      title: 'Not Found',
    });
  }
  static notFound(detail = 'Not found.') {
    return new ProblemException(HttpStatus.NOT_FOUND, ProblemCode.NOT_FOUND, detail);
  }
  static conflict(detail: string) {
    return new ProblemException(HttpStatus.CONFLICT, ProblemCode.CONFLICT, detail);
  }
  static invalidState(detail: string) {
    return new ProblemException(HttpStatus.UNPROCESSABLE_ENTITY, ProblemCode.INVALID_STATE, detail);
  }
  static rateLimited(detail = 'Too many requests. Slow down and retry.') {
    return new ProblemException(HttpStatus.TOO_MANY_REQUESTS, ProblemCode.RATE_LIMITED, detail);
  }
  static missingConfig(detail: string) {
    return new ProblemException(HttpStatus.SERVICE_UNAVAILABLE, ProblemCode.MISSING_CONFIG, detail);
  }
  static upstreamFailed(detail = 'An upstream service failed.') {
    return new ProblemException(HttpStatus.BAD_GATEWAY, ProblemCode.UPSTREAM_FAILED, detail);
  }
}

function defaultTitle(status: number): string {
  return (
    {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    }[status] ?? 'Error'
  );
}
