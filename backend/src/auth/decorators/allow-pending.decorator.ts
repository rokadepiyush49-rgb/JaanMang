import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_KEY = 'allowPending';

/**
 * Lets a route be reached by an account whose verification is still pending.
 *
 * Only the handful of routes that explain the wait qualify: `/auth/me`, the
 * verification status read, sign-out, and the onboarding writes an approved
 * account still has to finish. Everything else stays closed until a reviewer
 * acts, which is the whole point of the pending state.
 */
export const AllowPending = () => SetMetadata(ALLOW_PENDING_KEY, true);
