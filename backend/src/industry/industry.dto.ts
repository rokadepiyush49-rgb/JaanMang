import { z } from 'zod';
import { createZodDto } from '../common/validation';

/**
 * Industry portal input.
 *
 * Nothing here carries a company id. The organisation a request acts on is the
 * one the session holds a role in, resolved server-side — a client that could
 * name the company is a client that could name a competitor's, and every CSR
 * figure on this surface is commercially sensitive.
 */

export class ChallengeQueryDto extends createZodDto(
  z.object({
    domain: z.string().trim().min(2).max(40).optional(),
    state: z.string().trim().min(2).max(60).optional(),
    sdg: z.coerce.number().int().min(1).max(17).optional(),
  }),
) {}

export class UpdateCompanyDto extends createZodDto(
  z.object({
    sector: z.string().trim().min(2).max(120).optional(),
    about: z.string().trim().max(1200).optional(),
    website: z.string().trim().url('enter a full URL, including https://').max(300).optional(),
    csrThemes: z.array(z.string().trim().min(2).max(40)).max(12).optional(),
    geographies: z.array(z.string().trim().min(2).max(60)).max(30).optional(),
    technologyDomains: z.array(z.string().trim().min(2).max(60)).max(40).optional(),
    capabilities: z.array(z.string().trim().min(2).max(40)).max(20).optional(),
    sdgPreferences: z.array(z.coerce.number().int().min(1).max(17)).max(17).optional(),
    fundingMin: z.coerce.number().nonnegative().max(1e12).optional(),
    fundingMax: z.coerce.number().nonnegative().max(1e12).optional(),
    csrAllocated: z.coerce.number().nonnegative().max(1e12).optional(),
    csrPreferredCeiling: z.coerce.number().nonnegative().max(1e12).optional(),
    csrFinancialYear: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}$/, 'use the form 2026-27')
      .optional(),
  }),
) {}

export class CommitDto extends createZodDto(
  z.object({
    /**
     * `interest` is "tell the department we are looking at this"; `proposal` is
     * "here is a number". Kept apart because an officer plans around the
     * second and not the first.
     */
    kind: z.enum(['interest', 'proposal']).default('interest'),
    amount: z.coerce.number().nonnegative().max(1e12).optional(),
    note: z.string().trim().max(1000).optional(),
  }),
) {}

export class AssignMentorDto extends createZodDto(
  z.object({
    roles: z.array(z.string().trim().min(2).max(60)).min(1).max(6),
  }),
) {}

export class PostMessageDto extends createZodDto(
  z.object({
    body: z.string().trim().min(1, 'write something').max(4000),
  }),
) {}

export class TalentQueryDto extends createZodDto(
  z.object({
    skill: z.string().trim().min(1).max(60).optional(),
    institution: z.string().trim().min(1).max(64).optional(),
  }),
) {}

export class CsrQueryDto extends createZodDto(
  z.object({
    financialYear: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}$/, 'use the form 2026-27')
      .optional(),
  }),
) {}
