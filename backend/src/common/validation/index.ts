/**
 * Validation is `nestjs-zod` (v5). DTOs are `class Foo extends createZodDto(schema)`,
 * a single global `ZodValidationPipe` (registered as `APP_PIPE` in `AppModule`)
 * validates every annotated body / query / param, and `cleanupOpenApiDoc()`
 * (in `bootstrap.ts`) makes the same schemas render in OpenAPI.
 *
 * The only local addition is that `ProblemExceptionFilter` recognises
 * `nestjs-zod`'s `ZodValidationException` and renders it as problem+json with
 * per-field `errors`, so validation failures look like every other error.
 *
 * Re-exported here so feature modules import from one place.
 */
export { createZodDto } from 'nestjs-zod';
