import { z } from 'zod';
import { createZodDto } from '../../common/validation';
import { FACTOR_KEYS } from '../priority/priority.engine';

const PROBLEM_STATUS = [
  'pending_validation',
  'awaiting_sponsorship',
  'funding_required',
  'in_progress',
  'verification_pending',
  'resolved',
  'rejected',
] as const;

const PROBLEM_CATEGORY = [
  'water',
  'roads',
  'drainage',
  'streetlight',
  'waste',
  'bridge',
  'sanitation',
  'school',
  'health',
] as const;

export class ListProblemsQueryDto extends createZodDto(
  z.object({
    'filter[status]': z.enum(PROBLEM_STATUS).optional(),
    'filter[category]': z.enum(PROBLEM_CATEGORY).optional(),
    'filter[departmentId]': z.string().optional(),
    /**
     * Optional weighting override (the priority simulator). A JSON object of the
     * seven factor keys → number. Absent = the jurisdiction's published weights.
     */
    weights: z
      .string()
      .optional()
      .transform((s, ctx) => {
        if (!s) return undefined;
        try {
          const parsed = JSON.parse(s) as Record<string, unknown>;
          const out: Record<string, number> = {};
          for (const k of FACTOR_KEYS) {
            if (typeof parsed[k] !== 'number') throw new Error(k);
            out[k] = parsed[k] as number;
          }
          return out as Record<(typeof FACTOR_KEYS)[number], number>;
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'weights must be a JSON object of the seven factor keys',
          });
          return z.NEVER;
        }
      }),
  }),
) {}

export class RejectProblemDto extends createZodDto(
  z.object({ reason: z.string().trim().min(3).max(1000) }),
) {}

export class RouteProblemDto extends createZodDto(
  z.object({
    departmentId: z.string().trim().min(1),
    reason: z.string().trim().min(3).max(1000),
  }),
) {}

export class PublishWeightsDto extends createZodDto(
  z.object({
    weights: z.object(
      Object.fromEntries(FACTOR_KEYS.map((k) => [k, z.number().min(0).max(100)])) as Record<
        (typeof FACTOR_KEYS)[number],
        z.ZodNumber
      >,
    ),
    /** Scope the weighting to one jurisdiction; omit for the state-wide default. */
    jurisdictionId: z.string().optional(),
  }),
) {}
