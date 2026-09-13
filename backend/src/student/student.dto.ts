import { z } from 'zod';
import { createZodDto } from '../common/validation';

/** Categories a student may filter opportunities by. Mirrors ProblemCategory. */
const CATEGORIES = [
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

export class OpportunityQueryDto extends createZodDto(
  z.object({
    category: z.enum(CATEGORIES).optional(),
    difficulty: z.enum(['starter', 'intermediate', 'advanced']).optional(),
  }),
) {}

export class RecommendationQueryDto extends createZodDto(
  z.object({ limit: z.coerce.number().int().min(1).max(50).default(12) }),
) {}

export class ApplyDto extends createZodDto(
  z.object({
    teamId: z.string().trim().min(1).max(64).optional(),
    note: z.string().trim().max(1500).optional(),
  }),
) {}

/**
 * Profile input.
 *
 * Note what is absent: branch, year, institution, department, verification.
 * A student may not edit the facts their institution asserted about them, and
 * the surest way to keep that true is for the DTO to have no field for it.
 */
export class UpdateStudentProfileDto extends createZodDto(
  z.object({
    skills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    interests: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    preferredCategories: z.array(z.enum(CATEGORIES)).max(9).optional(),
    preferredDistricts: z.array(z.string().trim().min(2).max(60)).max(10).optional(),
    sdgInterests: z.array(z.coerce.number().int().min(1).max(17)).max(17).optional(),
    weeklyHours: z.coerce.number().int().min(0).max(80).optional(),
    githubUrl: z.string().trim().url().max(300).optional().or(z.literal('')),
    linkedinUrl: z.string().trim().url().max(300).optional().or(z.literal('')),
    portfolioUrl: z.string().trim().url().max(300).optional().or(z.literal('')),
    resumeUrl: z.string().trim().url().max(300).optional().or(z.literal('')),
  }),
) {}

export class ProposeDto extends createZodDto(
  z.object({
    problemId: z.string().trim().min(1).max(64),
    title: z.string().trim().min(6, 'give it a title somebody can scan').max(160),
    summary: z.string().trim().min(20, 'say what you would do, in a sentence or two').max(2000),
    approach: z.string().trim().min(20, 'how would you go about it?').max(4000),
    estimatedCost: z.coerce.number().nonnegative().max(1e12).optional(),
    durationDays: z.coerce.number().int().positive().max(1095).optional(),
    needs: z.array(z.string().trim().min(2).max(200)).max(10).optional(),
    teamId: z.string().trim().min(1).max(64).optional(),
  }),
) {}

export class EnterHackathonDto extends createZodDto(
  z.object({ teamId: z.string().trim().min(1).max(64) }),
) {}
