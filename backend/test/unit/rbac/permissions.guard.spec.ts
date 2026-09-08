import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { PermissionsGuard } from '../../../src/rbac/permissions.guard';
import { ProblemException } from '../../../src/common/errors/problem';
import type { AuthPrincipal } from '../../../src/auth/auth.types';

function principal(perms: string[], roles: string[] = ['gov_block']): AuthPrincipal {
  return {
    userId: 'u1',
    kind: 'staff',
    displayName: 'Test',
    roles,
    permissions: new Set(perms),
    orgIds: [],
    jurisdictionIds: ['jh-ran-blk'],
  };
}

function context(
  required: string[] | undefined,
  user: AuthPrincipal | undefined,
): ExecutionContext {
  return {
    getHandler: () => 'h',
    getClass: () => 'c',
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardWith(required: string[] | undefined, isPublic = false): PermissionsGuard {
  const reflector = {
    getAllAndOverride: (key: string) => (key === 'permissions' ? required : isPublic),
  } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

describe('PermissionsGuard', () => {
  it('passes routes that declare no permissions', () => {
    expect(guardWith(undefined).canActivate(context(undefined, undefined))).toBe(true);
  });

  it('allows a caller holding the required permission', () => {
    const g = guardWith(['problem.validate']);
    expect(g.canActivate(context(['problem.validate'], principal(['problem.validate'])))).toBe(
      true,
    );
  });

  it('rejects a caller missing the permission with a 403 naming it', () => {
    const g = guardWith(['funding.approve']);
    try {
      g.canActivate(context(['funding.approve'], principal(['problem.validate'])));
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ProblemException);
      expect((e as ProblemException).getStatus()).toBe(403);
      expect(((e as ProblemException).getResponse() as { detail: string }).detail).toContain(
        'funding.approve',
      );
    }
  });

  it('requires ALL listed permissions', () => {
    const g = guardWith(['problem.validate', 'officer.assign']);
    expect(() =>
      g.canActivate(
        context(['problem.validate', 'officer.assign'], principal(['problem.validate'])),
      ),
    ).toThrow(ProblemException);
  });

  it('401s when there is no authenticated user', () => {
    const g = guardWith(['problem.validate']);
    expect(() => g.canActivate(context(['problem.validate'], undefined))).toThrow(ProblemException);
  });
});
