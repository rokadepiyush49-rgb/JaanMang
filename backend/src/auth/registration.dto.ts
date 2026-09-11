import { z } from 'zod';
import { createZodDto } from '../common/validation';

/**
 * Registration and onboarding input.
 *
 * Every field below is read by a screen. Where a field is absent that a signup
 * form "usually" has — date of birth, semester, a pincode on a student — it is
 * absent because nothing in the product consumes it, and collecting data with
 * no consumer is a liability rather than a feature.
 */

/* ============================================================== shared === */

const email = z.string().trim().toLowerCase().email('enter a valid email address');
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{8,15}$/, 'enter a valid phone number');
const password = z
  .string()
  .min(8, 'use at least 8 characters')
  .max(200)
  .refine(
    (v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v),
    'include at least one letter and one number',
  );
const fullName = z.string().trim().min(2, 'enter your full name').max(120);
const designation = z.string().trim().min(2, 'enter your designation').max(120);

export const ROLE_CHOICES = ['student', 'government', 'industry', 'institute'] as const;
export type RoleChoice = (typeof ROLE_CHOICES)[number];

/* ============================================================= student === */

/**
 * Student signup is four fields.
 *
 * Institution, branch, year, district and skills are all genuinely required —
 * but they are required by the *dashboard*, not by the account, so they belong
 * in onboarding where the person can see what each one unlocks.
 */
export class StudentRegisterDto extends createZodDto(
  z.object({
    fullName,
    email,
    password,
  }),
) {}

export const DEGREES = [
  'B.Tech',
  'B.E.',
  'B.Sc',
  'B.A.',
  'B.Com',
  'BBA',
  'BCA',
  'Diploma',
  'M.Tech',
  'M.Sc',
  'MBA',
  'MCA',
  'PhD',
  'Other',
] as const;

export class StudentOnboardingDto extends createZodDto(
  z.object({
    /** An id from the institution register, or null when typed in by hand. */
    orgId: z.string().trim().min(1).nullish(),
    institutionName: z.string().trim().min(2, 'select or enter your institution').max(200),
    degree: z.enum(DEGREES),
    branch: z.string().trim().min(2, 'enter your branch or department').max(120),
    currentYear: z.coerce.number().int().min(1).max(6),
    graduationYear: z.coerce
      .number()
      .int()
      .min(new Date().getFullYear() - 2)
      .max(new Date().getFullYear() + 8),
    enrollmentNo: z.string().trim().max(60).optional(),
    state: z.string().trim().min(2, 'select your state').max(80),
    district: z.string().trim().min(2, 'select your district').max(80),
    /** Drives the match percentage on every opportunity card. */
    skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    interests: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    phone: phone.optional(),
  }),
) {}

/* ========================================================== government === */

export const GOV_BODY_TYPES = [
  'gram_panchayat',
  'nagar_panchayat',
  'municipal_council',
  'municipal_corporation',
  'block_office',
  'district_office',
  'line_department',
  'other',
] as const;

export const GOV_ACCESS_LEVELS = [
  'gov_panchayat',
  'gov_urban_body',
  'gov_block',
  'gov_district',
  'gov_field_officer',
] as const;

/**
 * Government signup collects the representative and the authority in one
 * submission, because a reviewer cannot verify half an application.
 *
 * `requestedRoleKey` is a *request*. The server records it and grants nothing;
 * a reviewer with `account.verify` decides what is actually issued.
 */
export class GovernmentRegisterDto extends createZodDto(
  z.object({
    fullName,
    designation,
    email,
    phone,
    password,

    bodyType: z.enum(GOV_BODY_TYPES),
    bodyName: z.string().trim().min(2, 'enter the authority name').max(200),
    state: z.string().trim().min(2).max(80),
    district: z.string().trim().min(2).max(80),
    block: z.string().trim().max(80).optional(),
    /**
     * Local Government Directory code. Optional on purpose: the platform
     * publicly states that every geographic unit currently carries a null LGD
     * code, so requiring one would lock out the bodies this is built for.
     */
    lgdCode: z
      .string()
      .trim()
      .regex(/^[0-9]{1,10}$/, 'an LGD code is up to 10 digits')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    /** The jurisdiction this body maps to, when the tree already has it. */
    jurisdictionId: z.string().trim().min(1).nullish(),
    requestedRoleKey: z.enum(GOV_ACCESS_LEVELS),
    departmentId: z.string().trim().min(1).nullish(),
    officeAddress: z.string().trim().max(300).optional(),
    pincode: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, 'a pincode is 6 digits')
      .optional()
      .or(z.literal('').transform(() => undefined)),
  }),
) {}

/* ============================================================ industry === */

export const ORG_SIZES = [
  'startup',
  'sme',
  'enterprise',
  'mnc',
  'psu',
  'csr_trust',
  'other',
] as const;

export const CSR_DOMAINS = [
  'water',
  'health',
  'education',
  'agriculture',
  'environment',
  'energy',
  'infrastructure',
  'accessibility',
  'rural',
] as const;

export const CAPABILITIES = [
  'manufacturing',
  'testing',
  'field-deployment',
  'software',
  'hardware',
  'logistics',
  'training',
  'certification',
] as const;

export class IndustryRegisterDto extends createZodDto(
  z.object({
    fullName,
    designation,
    email,
    phone,
    password,

    companyName: z.string().trim().min(2, 'enter the company name').max(200),
    legalName: z.string().trim().min(2, 'enter the registered legal name').max(200),
    orgSize: z.enum(ORG_SIZES),
    sector: z.string().trim().min(2, 'enter your industry sector').max(120),
    website: z.string().trim().url('enter a full URL, including https://').max(300),
    state: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    district: z.string().trim().max(80).optional(),
    pincode: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, 'a pincode is 6 digits')
      .optional()
      .or(z.literal('').transform(() => undefined)),
  }),
) {}

const branch = z.object({
  kind: z.enum(['branch', 'plant', 'office']).default('branch'),
  label: z.string().trim().max(120).optional(),
  state: z.string().trim().min(2).max(80),
  district: z.string().trim().max(80).optional(),
  city: z.string().trim().min(2).max(80),
  pincode: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, 'a pincode is 6 digits')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

/**
 * The match profile.
 *
 * CSR themes, geographies and the funding range carry 60 of the 100 points the
 * match engine scores a challenge on; technology domains and capabilities carry
 * the other 40. That is why these three are required and the rest are not —
 * without them `/industry/discover` can only show an unranked list.
 */
export class IndustryOnboardingDto extends createZodDto(
  z
    .object({
      csrThemes: z.array(z.enum(CSR_DOMAINS)).min(1, 'choose at least one CSR theme'),
      geographies: z.array(z.string().trim().min(2).max(80)).min(1, 'choose at least one state'),
      fundingMin: z.coerce.number().int().min(0),
      fundingMax: z.coerce.number().int().min(0),

      technologyDomains: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
      capabilities: z.array(z.enum(CAPABILITIES)).max(8).default([]),
      sdgPreferences: z.array(z.coerce.number().int().min(1).max(17)).max(17).default([]),

      employeeCount: z.coerce.number().int().min(1).max(5_000_000).optional(),
      yearEstablished: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),

      branches: z.array(branch).max(25).default([]),

      csrFinancialYear: z.string().trim().max(40).optional(),
      csrAllocated: z.coerce.number().min(0).optional(),
      csrPreferredCeiling: z.coerce.number().min(0).optional(),
    })
    .refine((v) => v.fundingMax >= v.fundingMin, {
      message: 'the maximum must be at least the minimum',
      path: ['fundingMax'],
    }),
) {}

/* ========================================================== institute === */

export const INSTITUTION_TYPES = [
  'university',
  'college',
  'polytechnic',
  'iti',
  'training_institute',
  'other',
] as const;

export const PROGRAM_LEVELS = [
  'certificate',
  'diploma',
  'undergraduate',
  'postgraduate',
  'doctoral',
] as const;

/**
 * Institute signup is the administrator plus the institution, in one
 * submission — same reasoning as government: a reviewer cannot verify half an
 * application.
 *
 * `claimOrgId` is the important field. Six institutions are already on the
 * register because students pick from it at onboarding, so a registrar from
 * BIT Mesra must attach to the existing organisation rather than create a
 * second one — otherwise the students who already named that institution are
 * on a roster nobody administers.
 *
 * Everything the dashboard reads — departments, programmes, labs, email
 * domains — is asked in the wizard afterwards, not here.
 */
export class InstituteRegisterDto extends createZodDto(
  z.object({
    fullName,
    designation,
    email,
    phone,
    password,

    /** An organisation already on the institution register being claimed. */
    claimOrgId: z.string().trim().min(1).nullish(),

    institutionName: z.string().trim().min(2, 'enter the institution name').max(200),
    institutionType: z.enum(INSTITUTION_TYPES),
    shortName: z.string().trim().min(2, 'enter a short name or acronym').max(80),
    /** AISHE / registration / affiliation number. Optional: ITIs and private
     *  training institutes routinely have none, and requiring one would lock
     *  out exactly the institutions with the least support. */
    aisheCode: z
      .string()
      .trim()
      .max(40)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    website: z
      .string()
      .trim()
      .url('enter a full URL, including https://')
      .max(300)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    establishedYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),

    state: z.string().trim().min(2).max(80),
    district: z.string().trim().max(80).optional(),
    city: z.string().trim().min(2).max(80),
    pincode: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, 'a pincode is 6 digits')
      .optional()
      .or(z.literal('').transform(() => undefined)),
  }),
) {}

const departmentSeed = z.object({
  name: z.string().trim().min(2, 'enter the department name').max(120),
  code: z.string().trim().min(1, 'enter a short code').max(16),
  programs: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(160),
        level: z.enum(PROGRAM_LEVELS),
        durationYears: z.coerce.number().int().min(1).max(8),
        intake: z.coerce.number().int().min(1).max(10_000).optional(),
      }),
    )
    .max(20)
    .default([]),
});

/**
 * The institute wizard.
 *
 * Departments are required and programmes are not, because every screen in the
 * portal keys on a department — the roster, the team assignment, the analytics
 * — while a programme is only ever a label on a student. An institution with no
 * departments has a dashboard that cannot group anything.
 *
 * `emailDomains` is the one field that does real work later: it is what lets
 * the roster say "this student's address is on your domain" instead of asking
 * a registrar to confirm 600 people by hand.
 */
export class InstituteOnboardingDto extends createZodDto(
  z.object({
    departments: z.array(departmentSeed).min(1, 'add at least one department').max(40),
    focusAreas: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    labs: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
    emailDomains: z
      .array(
        z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'enter a domain, e.g. bitmesra.ac.in'),
      )
      .max(10)
      .default([]),
    accreditation: z.string().trim().max(160).optional(),
    about: z.string().trim().max(1200).optional(),
    officialEmail: email.optional(),
    officialPhone: phone.optional(),
  }),
) {}

/* ========================================================== validation === */

export class EmailAvailableDto extends createZodDto(z.object({ email })) {}
