import { z } from 'zod';
import { createZodDto } from '../common/validation';

/**
 * Sponsorship input.
 *
 * No problem id anywhere: it is a route parameter, checked against the
 * caller's jurisdiction before anything else happens. A body that could name
 * the problem is a body that could name one in another district.
 */

export class ApproveSponsorshipDto extends createZodDto(
  z.object({
    sponsorId: z.string().trim().min(1).max(64),
    /**
     * Overrides the amount the sponsor proposed. Officers negotiate, and the
     * figure that ends up in the ledger has to be the agreed one rather than
     * the opening offer.
     */
    amount: z.coerce.number().nonnegative().max(1e12).optional(),
  }),
) {}

export class DeclineSponsorshipDto extends createZodDto(
  z.object({
    sponsorId: z.string().trim().min(1).max(64),
    reason: z.string().trim().min(3, 'say why — it is shown to the officer').max(500),
  }),
) {}
