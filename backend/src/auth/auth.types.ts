import type { UserKind } from '@prisma/client';

/**
 * The authenticated caller, attached to every request as `request.user` by the
 * JWT strategy and read through the `@CurrentUser()` decorator.
 *
 * Roles, permissions and scopes are resolved from the database on each request
 * rather than baked into the token: a permission system that can be 15 minutes
 * stale is a footgun, and the lookup is a single indexed query. The token stays
 * small — `sub` and `kind` only.
 */
export interface AuthPrincipal {
  userId: string;
  kind: UserKind;
  displayName: string;
  /** Role keys held by the user (e.g. "gov_block", "admin"). */
  roles: string[];
  /** Union of every permission key across those roles. */
  permissions: Set<string>;
  /** Organisation ids the user holds a role in. */
  orgIds: string[];
  /**
   * Jurisdiction ids the user is scoped to (an officer's panchayat, a DC's
   * district). The RBAC guard expands each to its subtree.
   */
  jurisdictionIds: string[];
}

export type AccessTokenPayload = {
  sub: string;
  kind: UserKind;
  typ: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  /** RefreshToken row id — lets logout/rotation target this exact token. */
  jti: string;
  typ: 'refresh';
};

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Access token lifetime in seconds. */
  expiresIn: number;
}
