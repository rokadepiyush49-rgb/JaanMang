import { z } from 'zod';
import { createZodDto } from '../common/validation';

export class ApproveFundingDto extends createZodDto(
  z.object({
    /**
     * Overrides the recommended figure. Rarely used and deliberately possible:
     * an officer who sanctions a different amount from the estimate must be
     * able to record what they actually sanctioned, or the ledger is fiction.
     */
    amount: z.coerce.number().nonnegative().max(1e12).optional(),
    /** Which budget head it comes from. Defaults to the routed department. */
    source: z.string().trim().min(1).max(160).optional(),
    note: z.string().trim().max(500).optional(),
  }),
) {}

export class RejectFundingDto extends createZodDto(
  z.object({
    reason: z.string().trim().min(3, 'say why — the reason is part of the record').max(500),
  }),
) {}
