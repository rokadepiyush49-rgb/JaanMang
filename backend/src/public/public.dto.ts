import { z } from 'zod';
import { createZodDto } from '../common/validation';

export const LEADERBOARD_SCOPES = [
  'citizens',
  'students',
  'institutes',
  'partners',
  'officers',
] as const;

export class PublicProblemQueryDto extends createZodDto(
  z.object({
    district: z.string().trim().min(2).max(80).optional(),
    category: z
      .enum([
        'water',
        'roads',
        'drainage',
        'streetlight',
        'waste',
        'bridge',
        'sanitation',
        'school',
        'health',
      ])
      .optional(),
    sdg: z.coerce.number().int().min(1).max(17).optional(),
  }),
) {}

export class LeaderboardQueryDto extends createZodDto(
  z.object({ limit: z.coerce.number().int().min(1).max(100).default(25) }),
) {}
