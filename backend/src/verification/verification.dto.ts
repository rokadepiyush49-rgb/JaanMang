import { z } from 'zod';
import { createZodDto } from '../common/validation';

export class PresignDto extends createZodDto(
  z.object({
    contentType: z.string().trim().min(3).max(120),
    sizeBytes: z.coerce.number().int().positive(),
    /** What the file is for — becomes the key prefix. */
    purpose: z.string().trim().min(2).max(40).default('evidence'),
  }),
) {}

export class VerifyDto extends createZodDto(
  z.object({
    /** The whole question: was it fixed. */
    fixed: z.boolean(),
    note: z.string().trim().max(1000).optional(),
    /** Keys from /uploads/presign. Evidence for the answer. */
    photoKeys: z.array(z.string().trim().min(1).max(300)).max(8).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  }),
) {}

export class EvidenceDto extends createZodDto(
  z.object({
    side: z.enum(['before', 'after']),
    keys: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
    note: z.string().trim().max(500).optional(),
  }),
) {}

/**
 * A rating, kept separate from a verification on purpose.
 *
 * Verification asks whether it was fixed; this asks how well. Only `stars` is
 * required — a citizen who wants to give one number and no essay should be
 * able to, and a form that demands four scores gets fewer honest answers.
 */
export class RateDto extends createZodDto(
  z.object({
    stars: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
    timeliness: z.coerce.number().int().min(1).max(5).optional(),
    quality: z.coerce.number().int().min(1).max(5).optional(),
    conduct: z.coerce.number().int().min(1).max(5).optional(),
  }),
) {}

export class ObjectionDto extends createZodDto(
  z.object({
    reason: z.string().trim().min(10, 'say what is wrong with the ranking').max(1500),
  }),
) {}

export class AdjustPriorityDto extends createZodDto(
  z.object({
    label: z.string().trim().min(3).max(80),
    /** Bounded to ±15 by the service — see why there. */
    points: z.coerce.number().min(-15).max(15),
    reason: z.string().trim().min(10, 'the reason is shown beside the score').max(1000),
    objectionId: z.string().trim().max(64).optional(),
  }),
) {}
