import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ProblemCode, ProblemException } from '../../../src/common/errors/problem';

describe('ProblemException', () => {
  it('renders a well-formed problem+json body', () => {
    const ex = ProblemException.badRequest('nope', { name: ['required'] });
    const body = ex.getResponse() as Record<string, unknown>;

    expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect(body).toMatchObject({
      title: 'Bad Request',
      status: 400,
      detail: 'nope',
      code: ProblemCode.VALIDATION_FAILED,
      errors: { name: ['required'] },
    });
  });

  it('maps out-of-scope to a 404 so record existence is not leaked', () => {
    const ex = ProblemException.outOfScope();
    expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect((ex.getResponse() as Record<string, unknown>).code).toBe(ProblemCode.OUT_OF_SCOPE);
  });

  it('uses 503 for missing configuration', () => {
    const ex = ProblemException.missingConfig('GROQ_API_KEY is not set');
    expect(ex.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect((ex.getResponse() as Record<string, unknown>).code).toBe(ProblemCode.MISSING_CONFIG);
  });
});
