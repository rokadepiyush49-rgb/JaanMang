import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  CAPABILITIES,
  CSR_DOMAINS,
  DEGREES,
  GOV_ACCESS_LEVELS,
  GOV_BODY_TYPES,
  INSTITUTION_TYPES,
  ORG_SIZES,
  PROGRAM_LEVELS,
} from '../auth/registration.dto';

/**
 * `/api/v1/registry` — everything a signup form needs to fill a dropdown.
 *
 * Public, because a person has to be able to complete signup before they have
 * a session. Nothing here is user data: it is the institution register, the
 * administrative tree, and the closed vocabularies the DTOs already validate
 * against. Serving the vocabularies from the same constants the validator uses
 * is what stops a form offering an option the server would reject.
 */
@ApiTags('registry')
@Controller({ path: 'registry', version: '1' })
@Throttle({ default: { ttl: 60_000, limit: process.env.NODE_ENV === 'test' ? 100_000 : 60 } })
export class RegistryController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('institutions')
  @ApiOperation({ summary: 'The institution register, for the student signup picker' })
  async institutions(@Query('q') q?: string) {
    const rows = await this.prisma.organization.findMany({
      where: {
        type: 'institution',
        deletedAt: null,
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
      },
      select: {
        id: true,
        name: true,
        institution: { select: { shortName: true, city: true, state: true, emailDomains: true } },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      shortName: r.institution?.shortName ?? r.name,
      city: r.institution?.city ?? '',
      state: r.institution?.state ?? '',
      emailDomains: r.institution?.emailDomains ?? [],
    }));
  }

  @Public()
  @Get('jurisdictions')
  @ApiOperation({ summary: 'The administrative tree, for the cascading government picker' })
  async jurisdictions() {
    const rows = await this.prisma.jurisdiction.findMany({
      select: { id: true, level: true, name: true, parentId: true },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
    return rows.map((j) => ({ ...j, parentId: j.parentId ?? null }));
  }

  @Public()
  @Get('departments')
  @ApiOperation({ summary: 'Line departments, for the delivery-officer signup path' })
  departments() {
    return this.prisma.department.findMany({
      select: { id: true, name: true, shortName: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * The closed vocabularies, served from the same constants the DTOs validate
   * against — so a form can never offer a value the server will refuse.
   */
  @Public()
  @Get('taxonomy')
  @ApiOperation({ summary: 'Closed vocabularies for every signup and onboarding field' })
  taxonomy() {
    return {
      degrees: DEGREES,
      branches: BRANCHES,
      skills: SKILLS,
      interests: INTERESTS,
      states: STATES,
      districtsByState: DISTRICTS_BY_STATE,
      govBodyTypes: GOV_BODY_TYPES.map((key) => ({ key, label: GOV_BODY_LABEL[key] })),
      govAccessLevels: GOV_ACCESS_LEVELS.map((key) => ({
        key,
        label: GOV_ACCESS_LABEL[key],
        detail: GOV_ACCESS_DETAIL[key],
      })),
      orgSizes: ORG_SIZES.map((key) => ({ key, label: ORG_SIZE_LABEL[key] })),
      sectors: SECTORS,
      csrDomains: CSR_DOMAINS.map((key) => ({ key, label: CSR_DOMAIN_LABEL[key] })),
      capabilities: CAPABILITIES.map((key) => ({ key, label: CAPABILITY_LABEL[key] })),
      technologyDomains: TECHNOLOGY_DOMAINS,
      sdgs: SDGS,
      institutionTypes: INSTITUTION_TYPES.map((key) => ({
        key,
        label: INSTITUTION_TYPE_LABEL[key],
      })),
      programLevels: PROGRAM_LEVELS.map((key) => ({ key, label: PROGRAM_LEVEL_LABEL[key] })),
    };
  }
}

/* ------------------------------------------------------------------------ */

const INSTITUTION_TYPE_LABEL: Record<(typeof INSTITUTION_TYPES)[number], string> = {
  university: 'University',
  college: 'College',
  polytechnic: 'Polytechnic',
  iti: 'Industrial Training Institute (ITI)',
  training_institute: 'Training institute',
  other: 'Other educational institution',
};

const PROGRAM_LEVEL_LABEL: Record<(typeof PROGRAM_LEVELS)[number], string> = {
  certificate: 'Certificate',
  diploma: 'Diploma',
  undergraduate: 'Undergraduate',
  postgraduate: 'Postgraduate',
  doctoral: 'Doctoral',
};

const GOV_BODY_LABEL: Record<(typeof GOV_BODY_TYPES)[number], string> = {
  gram_panchayat: 'Gram Panchayat',
  nagar_panchayat: 'Nagar Panchayat',
  municipal_council: 'Municipal Council / Nagar Parishad',
  municipal_corporation: 'Municipal Corporation / Nagar Nigam',
  block_office: 'Block Development Office',
  district_office: 'District Administration',
  line_department: 'Line Department',
  other: 'Other government authority',
};

const GOV_ACCESS_LABEL: Record<(typeof GOV_ACCESS_LEVELS)[number], string> = {
  gov_panchayat: 'Panchayat Secretary',
  gov_urban_body: 'Urban Local Body Officer',
  gov_block: 'Block Development Officer',
  gov_district: 'District Administration',
  gov_field_officer: 'Delivery Officer',
};

const GOV_ACCESS_DETAIL: Record<(typeof GOV_ACCESS_LEVELS)[number], string> = {
  gov_panchayat: 'Validate and route problems in one panchayat, invite sponsors, assign officers.',
  gov_urban_body: 'The same, for a ward or urban local body, plus accepting sponsorship.',
  gov_block: 'Everything a panchayat can do across the whole block, plus approving funding.',
  gov_district: 'District-wide, plus publishing the priority weighting every ranking uses.',
  gov_field_officer: 'Update progress on the projects assigned to you. No approval rights.',
};

const ORG_SIZE_LABEL: Record<(typeof ORG_SIZES)[number], string> = {
  startup: 'Startup (under 50)',
  sme: 'SME (50–250)',
  enterprise: 'Enterprise (250–5,000)',
  mnc: 'Multinational (5,000+)',
  psu: 'Public sector undertaking',
  csr_trust: 'CSR trust or foundation',
  other: 'Other',
};

const CSR_DOMAIN_LABEL: Record<(typeof CSR_DOMAINS)[number], string> = {
  water: 'Water & sanitation',
  health: 'Public health',
  education: 'Education',
  agriculture: 'Agriculture',
  environment: 'Environment',
  energy: 'Energy',
  infrastructure: 'Infrastructure',
  accessibility: 'Accessibility',
  rural: 'Rural development',
};

const CAPABILITY_LABEL: Record<(typeof CAPABILITIES)[number], string> = {
  manufacturing: 'Manufacturing',
  testing: 'Testing & calibration',
  'field-deployment': 'Field deployment',
  software: 'Software',
  hardware: 'Hardware',
  logistics: 'Logistics',
  training: 'Training',
  certification: 'Certification & standards',
};

const BRANCHES = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Mining Engineering',
  'Environmental Engineering',
  'Production & Industrial',
  'Biotechnology',
  'Data Science & AI',
  'Architecture & Planning',
  'Agriculture',
  'Public Health',
  'Social Work',
  'Economics',
  'Management',
  'Design',
  'Other',
];

/** Seeded from the skills the opportunity fixtures already match against. */
const SKILLS = [
  'React',
  'Node.js',
  'Python',
  'Java',
  'Flutter',
  'Figma',
  'UI/UX',
  'Data Analysis',
  'Machine Learning',
  'GIS',
  'IoT',
  'Embedded Systems',
  'Electronics',
  'CAD',
  'Civil Design',
  'Water Systems',
  'Solar & Power',
  'Field Survey',
  'Community Facilitation',
  'Public Speaking',
  'Technical Writing',
  'Project Management',
  'Statistics',
  'Hindi',
  'Santali',
  'Ho',
  'Kurukh',
];

const INTERESTS = [
  'Sustainability',
  'Public Health',
  'Education',
  'Water & Sanitation',
  'Rural Livelihoods',
  'Governance',
  'Climate',
  'Accessibility',
  'Agriculture',
  'Energy',
  'Tribal Development',
  'Open Data',
];

const SECTORS = [
  'Industrial IoT & Water Infrastructure',
  'Metals & Mining',
  'Steel',
  'Coal & Energy',
  'Power & Renewables',
  'Information Technology',
  'Telecommunications',
  'Pharmaceuticals',
  'Healthcare',
  'Automotive',
  'Cement & Construction',
  'Chemicals',
  'FMCG',
  'Banking & Financial Services',
  'Agritech',
  'Logistics',
  'Education Technology',
  'Engineering & Capital Goods',
  'Textiles',
  'Other',
];

const TECHNOLOGY_DOMAINS = [
  'IoT & Telemetry',
  'LoRaWAN',
  'Water Systems',
  'Sensors & Instrumentation',
  'Embedded Systems',
  'Cloud & Data Platforms',
  'Solar & Power Electronics',
  'GIS',
  'AI/ML',
  'Computer Vision',
  'Mobile Applications',
  'Hydraulic Modelling',
  'Materials & Metallurgy',
  'Civil & Structural',
  'Cold Chain',
  'Waste Processing',
  'Biomedical Devices',
  'Robotics & Drones',
];

const SDGS = [
  { number: 1, short: 'No poverty' },
  { number: 2, short: 'Zero hunger' },
  { number: 3, short: 'Good health' },
  { number: 4, short: 'Quality education' },
  { number: 5, short: 'Gender equality' },
  { number: 6, short: 'Clean water' },
  { number: 7, short: 'Affordable energy' },
  { number: 8, short: 'Decent work' },
  { number: 9, short: 'Industry & innovation' },
  { number: 10, short: 'Reduced inequalities' },
  { number: 11, short: 'Sustainable cities' },
  { number: 12, short: 'Responsible consumption' },
  { number: 13, short: 'Climate action' },
  { number: 14, short: 'Life below water' },
  { number: 15, short: 'Life on land' },
  { number: 16, short: 'Peace & institutions' },
  { number: 17, short: 'Partnerships' },
];

/**
 * The states the platform operates in, and Jharkhand's districts in full.
 *
 * Jharkhand is complete because that is where the product is deployed and
 * where a wrong district silently breaks the region filter. The other states
 * are listed so an industry partner can declare a CSR geography, which is all
 * they are used for.
 */
const STATES = [
  'Jharkhand',
  'Bihar',
  'West Bengal',
  'Odisha',
  'Chhattisgarh',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Maharashtra',
  'Gujarat',
  'Rajasthan',
  'Karnataka',
  'Telangana',
  'Andhra Pradesh',
  'Tamil Nadu',
  'Kerala',
  'Punjab',
  'Haryana',
  'Delhi',
  'Assam',
  'Uttarakhand',
  'Himachal Pradesh',
  'Goa',
];

const DISTRICTS_BY_STATE: Record<string, string[]> = {
  Jharkhand: [
    'Bokaro',
    'Chatra',
    'Deoghar',
    'Dhanbad',
    'Dumka',
    'East Singhbhum',
    'Garhwa',
    'Giridih',
    'Godda',
    'Gumla',
    'Hazaribagh',
    'Jamtara',
    'Khunti',
    'Koderma',
    'Latehar',
    'Lohardaga',
    'Pakur',
    'Palamu',
    'Ramgarh',
    'Ranchi',
    'Sahebganj',
    'Seraikela-Kharsawan',
    'Simdega',
    'West Singhbhum',
  ],
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia'],
  'West Bengal': ['Kolkata', 'Howrah', 'Purulia', 'Bankura', 'Paschim Bardhaman'],
  Odisha: ['Khordha', 'Cuttack', 'Sundargarh', 'Keonjhar', 'Mayurbhanj'],
  Chhattisgarh: ['Raipur', 'Bilaspur', 'Korba', 'Durg', 'Raigarh'],
};
