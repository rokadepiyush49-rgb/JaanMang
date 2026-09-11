import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { ProblemBody, ProblemCode } from './problem';

/**
 * Turns every thrown error into RFC 9457 `application/problem+json`.
 *
 *   - `ProblemException` / `HttpException` → their status + body
 *   - `ZodError` (e.g. from a manual `.parse`) → 400 with field errors
 *   - anything else → 500 with no internal detail in the response
 *
 * 5xx are logged with the stack; 4xx are not (they are the client's problem,
 * not ours, and they are noisy).
 */
@Catch()
export class ProblemExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();
    const instance = req?.url;

    const body = this.toProblem(exception, instance);

    if (body.status >= 500) {
      this.logger.error(
        `${req?.method} ${instance} → ${body.status} ${body.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    void res.status(body.status).type('application/problem+json').send(body);
  }

  private toProblem(exception: unknown, instance?: string): ProblemBody {
    // nestjs-zod wraps validation failures; unwrap to a proper field map.
    if (exception instanceof ZodValidationException) {
      return this.fromZodError(exception.getZodError(), instance);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // A ProblemException already carries a well-formed body.
      if (isProblemBody(response)) {
        return { ...response, instance };
      }

      // A plain Nest HttpException (thrown by guards, pipes, `NotFoundException`
      // from the router, etc.) — normalise it.
      const detail =
        typeof response === 'string'
          ? response
          : (((response as Record<string, unknown>)?.message as string) ?? exception.message);
      return {
        type: 'about:blank',
        title: titleFor(status),
        status,
        detail: Array.isArray(detail) ? detail.join('; ') : detail,
        code: codeForStatus(status),
        instance,
      };
    }

    if (exception instanceof ZodError) {
      return this.fromZodError(exception, instance);
    }

    return {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred.',
      code: ProblemCode.INTERNAL,
      instance,
    };
  }

  /**
   * `error` is a zod `ZodError` — typed `unknown` because `nestjs-zod` v5
   * supports both zod 3 and zod 4 and does not commit to one `ZodError` type.
   * We duck-type on `.issues`, which both versions expose.
   */
  private fromZodError(error: unknown, instance?: string): ProblemBody {
    const issues =
      error instanceof ZodError
        ? error.issues
        : ((error as { issues?: ZodError['issues'] })?.issues ?? []);
    const errors: Record<string, string[]> = {};
    for (const issue of issues) {
      const key = issue.path.join('.') || '(root)';
      (errors[key] ??= []).push(issue.message);
    }
    return {
      type: 'about:blank',
      title: 'Bad Request',
      status: HttpStatus.BAD_REQUEST,
      detail: 'Request validation failed.',
      code: ProblemCode.VALIDATION_FAILED,
      errors,
      instance,
    };
  }
}

function isProblemBody(v: unknown): v is ProblemBody {
  return (
    typeof v === 'object' &&
    v !== null &&
    'code' in v &&
    'status' in v &&
    'title' in v &&
    'detail' in v
  );
}

function titleFor(status: number): string {
  return (
    {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
    }[status] ?? 'Error'
  );
}

function codeForStatus(status: number): ProblemCode {
  switch (status) {
    case 400:
      return ProblemCode.VALIDATION_FAILED;
    case 401:
      return ProblemCode.UNAUTHENTICATED;
    case 403:
      return ProblemCode.FORBIDDEN;
    case 404:
      return ProblemCode.NOT_FOUND;
    case 409:
      return ProblemCode.CONFLICT;
    case 422:
      return ProblemCode.INVALID_STATE;
    case 429:
      return ProblemCode.RATE_LIMITED;
    default:
      return status >= 500 ? ProblemCode.INTERNAL : ProblemCode.VALIDATION_FAILED;
  }
}
