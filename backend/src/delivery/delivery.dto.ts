import { z } from 'zod';
import { createZodDto } from '../common/validation';

export class AssignOfficerDto extends createZodDto(
  z.object({
    officerId: z.string().trim().min(1).max(64),
  }),
) {}

export class ProjectProgressDto extends createZodDto(
  z.object({
    progress: z.coerce.number().int().min(0).max(100),
    note: z.string().trim().max(500).optional(),
  }),
) {}

export class AutomationToggleDto extends createZodDto(
  z.object({
    /** Absent flips whatever it currently is; present sets it outright. */
    enabled: z.boolean().optional(),
  }),
) {}
