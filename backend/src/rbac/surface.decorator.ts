import { SetMetadata } from '@nestjs/common';
import type { Surface } from '@prisma/client';

export const SURFACES_KEY = 'surfaces';

/**
 * Restricts a controller or route to the audiences it was written for.
 *
 * `@Permissions()` answers "may this user perform this action". This answers
 * the question before it: "is this user's workspace the one this endpoint
 * belongs to at all". A student holds no government permission, so every
 * government *mutation* was already closed to them — but the reference reads
 * (officers, departments, sponsors, alerts) carry no permission and were
 * therefore open to anyone with a session.
 *
 * That was safe only for as long as `/gov-login` was the sole way to get a
 * session and it rejected everyone who was not staff. Once students and
 * industry partners could sign in, the same endpoints started handing out
 * officer names, personal phone numbers and performance statistics to them.
 * This decorator is the fix, and it is a controller-level default rather than
 * a per-route opt-in so a new endpoint is closed unless someone opens it.
 */
export const Surfaces = (...surfaces: Surface[]) => SetMetadata(SURFACES_KEY, surfaces);
