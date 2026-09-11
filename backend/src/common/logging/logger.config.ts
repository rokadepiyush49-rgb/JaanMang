import type { Params } from 'nestjs-pino';

/**
 * Structured request logging via pino.
 *
 * Redaction is not optional here: citizen report text (`raw`), phone numbers,
 * emails and any `authorization` header must never reach a log line. The audit
 * trail records *what* changed; logs record *that* a request happened.
 */
export function loggerConfig(opts: { level: string; pretty: boolean }): Params {
  return {
    pinoHttp: {
      level: opts.level,
      transport: opts.pretty
        ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' } }
        : undefined,
      autoLogging: {
        ignore: (req) => req.url === '/healthz' || req.url === '/readyz',
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.code',
          'req.body.otp',
          'req.body.phone',
          'req.body.email',
          'req.body.raw',
          'req.body.transcript',
          'res.headers["set-cookie"]',
        ],
        remove: true,
      },
      customProps: (req) => ({
        userId: (req as { user?: { sub?: string } }).user?.sub,
      }),
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    },
  };
}
