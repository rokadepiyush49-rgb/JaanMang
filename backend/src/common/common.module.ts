import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ProblemExceptionFilter } from './errors/problem-exception.filter';

/**
 * Cross-cutting pieces every feature module relies on. The exception filter is
 * registered here (rather than only in `main.ts`) so it also covers exceptions
 * thrown during dependency resolution in tests that bootstrap a partial module
 * graph.
 */
@Global()
@Module({
  providers: [{ provide: APP_FILTER, useClass: ProblemExceptionFilter }],
})
export class CommonModule {}
