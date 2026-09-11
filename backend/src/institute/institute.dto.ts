import { z } from 'zod';
import { createZodDto } from '../common/validation';
import { INSTITUTION_TYPES, PROGRAM_LEVELS } from '../auth/registration.dto';

/**
 * Institute portal input.
 *
 * Nothing here carries an `orgId`. The institution a request acts on is the one
 * the session holds a role in, resolved server-side by `InstituteService.orgOf`
 * — a client that could name the organisation is a client that could name
 * someone else's, and every screen in this portal reads student records.
 */

const name = (what: string) => z.string().trim().min(2, `enter the ${what}`).max(160);
const optionalText = (max = 300) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

/* ============================================================== profile === */

export class UpdateProfileDto extends createZodDto(
  z.object({
    name: name('institution name').optional(),
    shortName: z.string().trim().min(2).max(80).optional(),
    institutionType: z.enum(INSTITUTION_TYPES).optional(),
    about: optionalText(1200),
    accreditation: optionalText(160),
    aisheCode: optionalText(40),
    website: z
      .string()
      .trim()
      .url('enter a full URL, including https://')
      .max(300)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    officialEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email('enter a valid email address')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    officialPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{8,15}$/, 'enter a valid phone number')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    establishedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
    city: z.string().trim().min(2).max(80).optional(),
    state: z.string().trim().min(2).max(80).optional(),
    district: optionalText(80),
    focusAreas: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    labs: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
    emailDomains: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'enter a domain, e.g. bitmesra.ac.in'),
      )
      .max(10)
      .optional(),
  }),
) {}

/* ========================================================== departments === */

export class DepartmentDto extends createZodDto(
  z.object({
    name: name('department name'),
    code: z.string().trim().min(1, 'enter a short code').max(16).toUpperCase(),
    hodFacultyId: z.string().trim().min(1).nullish(),
    facultyStrength: z.coerce.number().int().min(0).max(5000).nullish(),
  }),
) {}

export class DepartmentPatchDto extends createZodDto(
  z.object({
    name: name('department name').optional(),
    code: z.string().trim().min(1).max(16).toUpperCase().optional(),
    hodFacultyId: z.string().trim().min(1).nullish(),
    facultyStrength: z.coerce.number().int().min(0).max(5000).nullish(),
  }),
) {}

/* ============================================================= programs === */

const programShape = {
  departmentId: z.string().trim().min(1, 'choose a department'),
  name: name('programme name'),
  level: z.enum(PROGRAM_LEVELS),
  durationYears: z.coerce.number().int().min(1).max(8),
  intake: z.coerce.number().int().min(1).max(10_000).nullish(),
  eligibility: optionalText(400),
  status: z.enum(['active', 'paused', 'archived']).optional(),
};

export class ProgramDto extends createZodDto(z.object(programShape)) {}
export class ProgramPatchDto extends createZodDto(
  z
    .object(programShape)
    .partial()
    .refine((v) => Object.keys(v).length > 0, 'nothing to update'),
) {}

/* ============================================================= students === */

/**
 * What an institution may change about a student.
 *
 * Placement and verification only. An institution does not edit a student's
 * name, skills, contact details or academic self-description — that record
 * belongs to the student, and a portal that lets a registrar rewrite it is a
 * portal that will be used to rewrite it.
 */
export class StudentPlacementDto extends createZodDto(
  z.object({
    departmentId: z.string().trim().min(1).nullish(),
    programId: z.string().trim().min(1).nullish(),
    verified: z.boolean().optional(),
  }),
) {}

export class StudentQueryDto extends createZodDto(
  z.object({
    q: optionalText(120),
    departmentId: optionalText(60),
    programId: optionalText(60),
    year: z.coerce.number().int().min(1).max(6).optional(),
    status: z.enum(['all', 'verified', 'unverified']).default('all'),
  }),
) {}

/* ============================================================== faculty === */

export class FacultyCreateDto extends createZodDto(
  z.object({
    fullName: name('full name'),
    email: z.string().trim().toLowerCase().email('enter a valid email address'),
    designation: z.string().trim().min(2, 'enter a designation').max(120),
    departmentId: z.string().trim().min(1).nullish(),
    expertise: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    officialPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{8,15}$/, 'enter a valid phone number')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    guideCapacity: z.coerce.number().int().min(1).max(30).default(4),
    /**
     * The first password. Sent to the faculty member out of band — there is no
     * invite-email infrastructure yet, and inventing one silently would leave
     * accounts nobody can reach.
     */
    password: z
      .string()
      .min(8, 'use at least 8 characters')
      .max(200)
      .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), 'include a letter and a number'),
  }),
) {}

export class FacultyPatchDto extends createZodDto(
  z.object({
    designation: z.string().trim().min(2).max(120).optional(),
    departmentId: z.string().trim().min(1).nullish(),
    expertise: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    officialPhone: optionalText(20),
    guideCapacity: z.coerce.number().int().min(1).max(30).optional(),
  }),
) {}

/* ================================================================ teams === */

export class TeamCreateDto extends createZodDto(
  z.object({
    name: name('team name'),
    title: optionalText(200),
    departmentId: z.string().trim().min(1).nullish(),
    problemId: z.string().trim().min(1).nullish(),
    facultyId: z.string().trim().min(1).nullish(),
    memberIds: z.array(z.string().trim().min(1)).max(12).default([]),
    skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  }),
) {}

export class TeamPatchDto extends createZodDto(
  z.object({
    name: name('team name').optional(),
    title: optionalText(200),
    departmentId: z.string().trim().min(1).nullish(),
    problemId: z.string().trim().min(1).nullish(),
    skills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    stage: z
      .enum([
        'discovery',
        'team_formed',
        'funded',
        'research',
        'prototype',
        'testing',
        'pilot',
        'deployment',
        'impact',
      ])
      .optional(),
    status: z.enum(['forming', 'active', 'submitted', 'completed', 'archived']).optional(),
  }),
) {}

/** Assigning the faculty guide. `null` removes the current one. */
export class AssignGuideDto extends createZodDto(
  z.object({ facultyId: z.string().trim().min(1).nullable() }),
) {}

export class AssignMembersDto extends createZodDto(
  z.object({
    studentIds: z.array(z.string().trim().min(1)).min(1, 'choose at least one student').max(12),
  }),
) {}

/* ========================================================== submissions === */

export class ReviewDto extends createZodDto(
  z.object({
    note: z.string().trim().max(1000).optional(),
  }),
) {}

export class RequestChangesDto extends createZodDto(
  z.object({
    note: z.string().trim().min(4, 'say what needs to change').max(1000),
  }),
) {}
