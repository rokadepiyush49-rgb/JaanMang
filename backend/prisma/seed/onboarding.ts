import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

/**
 * Identity seed — the register a new account picks from, one demo account per
 * surface, and the public statistics series the landing page renders.
 *
 * Runs after `seedGov`, because the government users and the jurisdiction tree
 * it creates are what the student districts and the partner geographies refer
 * to.
 */

const DEV_PASSWORD = 'jansetu-dev';

/* ======================================================== institutions === */

const INSTITUTIONS = [
  {
    id: 'inst-bit-mesra',
    name: 'Birla Institute of Technology, Mesra',
    shortName: 'BIT Mesra',
    city: 'Ranchi',
    state: 'Jharkhand',
    accreditation: 'NAAC A+ · Deemed University',
    focusAreas: ['Electronics & Communication', 'Civil Engineering', 'Remote Sensing'],
    labs: ['Embedded Systems Lab', 'Water Resources Lab', 'Geoinformatics Centre'],
    emailDomains: ['bitmesra.ac.in'],
  },
  {
    id: 'inst-nit-jsr',
    name: 'National Institute of Technology, Jamshedpur',
    shortName: 'NIT Jamshedpur',
    city: 'Jamshedpur',
    state: 'Jharkhand',
    accreditation: 'Institute of National Importance',
    focusAreas: ['Electrical Engineering', 'Production Engineering', 'Energy Systems'],
    labs: ['Power Electronics Lab', 'Renewable Energy Lab', 'Fabrication Workshop'],
    emailDomains: ['nitjsr.ac.in'],
  },
  {
    id: 'inst-ranchi-uni',
    name: 'Ranchi University',
    shortName: 'Ranchi University',
    city: 'Ranchi',
    state: 'Jharkhand',
    accreditation: 'NAAC B++ · State University',
    focusAreas: ['Geology', 'Environmental Science', 'Computer Applications'],
    labs: ['GIS Lab', 'Environmental Testing Lab'],
    emailDomains: ['ranchiuniversity.ac.in'],
  },
  {
    id: 'inst-ism-dhanbad',
    name: 'Indian Institute of Technology (ISM) Dhanbad',
    shortName: 'IIT ISM Dhanbad',
    city: 'Dhanbad',
    state: 'Jharkhand',
    accreditation: 'Institute of National Importance',
    focusAreas: ['Mining Engineering', 'Environmental Engineering', 'Data Science'],
    labs: ['Mine Reclamation Lab', 'Hydrogeology Lab', 'HPC Cluster'],
    emailDomains: ['iitism.ac.in'],
  },
  {
    id: 'inst-vbu',
    name: 'Vinoba Bhave University',
    shortName: 'Vinoba Bhave University',
    city: 'Hazaribagh',
    state: 'Jharkhand',
    accreditation: 'NAAC B+ · State University',
    focusAreas: ['Life Sciences', 'Rural Development', 'Commerce'],
    labs: ['Community Health Lab'],
    emailDomains: ['vbu.ac.in'],
  },
  {
    id: 'inst-kolhan',
    name: 'Kolhan University',
    shortName: 'Kolhan University',
    city: 'Chaibasa',
    state: 'Jharkhand',
    accreditation: 'State University',
    focusAreas: ['Tribal Studies', 'Botany', 'Computer Science'],
    labs: ['Field Survey Unit'],
    emailDomains: ['kolhanuniversity.ac.in'],
  },
];

/* ============================================================ industry === */

const PARTNER = {
  id: 'co-nirvaha',
  name: 'Nirvaha Technologies',
  legalName: 'Nirvaha Technologies Ltd.',
  sector: 'Industrial IoT & Water Infrastructure',
  about:
    'Nirvaha builds instrumentation and telemetry for public utilities — pumping stations, distribution networks, micro-grids and treatment plants. Its CSR arm backs student-built civic technology in the districts where its field crews already operate.',
};

/* =================================================== platform statistics === */

/**
 * The historical series behind the landing page.
 *
 * Live figures (problems, reports, villages) are counted from their own tables
 * at request time. These are the years that predate this database, and each
 * row carries the provenance string the page renders beside it — the platform's
 * rule is that no number appears without its source, and a public page is not
 * an exception to that.
 */
const YEAR_STATS = [
  {
    year: 2023,
    reportsSubmitted: 18420,
    problemsValidated: 4180,
    problemsResolved: 2640,
    citizensVerifying: 9310,
    villagesCovered: 412,
    panchayatsOnboard: 64,
    studentsEngaged: 780,
    partnerOrgs: 9,
    fundsRouted: 41200000,
    provenance: 'Pilot year · Ranchi and Khunti blocks · figures modelled on the Mission Antyodaya and BBMP grievance corpora',
  },
  {
    year: 2024,
    reportsSubmitted: 47960,
    problemsValidated: 11240,
    problemsResolved: 7890,
    citizensVerifying: 26400,
    villagesCovered: 1180,
    panchayatsOnboard: 186,
    studentsEngaged: 2340,
    partnerOrgs: 24,
    fundsRouted: 128600000,
    provenance: 'District rollout · Ranchi, Khunti, Dumka · figures modelled on the Mission Antyodaya and BBMP grievance corpora',
  },
  {
    year: 2025,
    reportsSubmitted: 92310,
    problemsValidated: 21870,
    problemsResolved: 16420,
    citizensVerifying: 54100,
    villagesCovered: 2460,
    panchayatsOnboard: 398,
    studentsEngaged: 5120,
    partnerOrgs: 47,
    fundsRouted: 294700000,
    provenance: 'Eight districts · figures modelled on the Mission Antyodaya and BBMP grievance corpora',
  },
  {
    year: 2026,
    reportsSubmitted: 141280,
    problemsValidated: 33940,
    problemsResolved: 25310,
    citizensVerifying: 81760,
    villagesCovered: 3820,
    panchayatsOnboard: 612,
    studentsEngaged: 8940,
    partnerOrgs: 68,
    fundsRouted: 462300000,
    provenance: 'Year to date · statewide · figures modelled on the Mission Antyodaya and BBMP grievance corpora',
  },
];

export async function seedOnboarding(
  prisma: PrismaClient,
): Promise<{ devLogins: string[] }> {
  const passwordHash = await argon2.hash(DEV_PASSWORD, { type: argon2.argon2id });
  const devLogins: string[] = [];

  /* -- the institution register --------------------------------------- */
  for (const inst of INSTITUTIONS) {
    await prisma.organization.create({
      data: {
        id: inst.id,
        type: 'institution',
        name: inst.name,
        institution: {
          create: {
            shortName: inst.shortName,
            city: inst.city,
            state: inst.state,
            accreditation: inst.accreditation,
            focusAreas: inst.focusAreas,
            labs: inst.labs,
            emailDomains: inst.emailDomains,
          },
        },
        locations: {
          create: {
            kind: 'headquarters',
            state: inst.state,
            city: inst.city,
            isPrimary: true,
          },
        },
      },
    });
  }

  /* -- a verified industry partner ------------------------------------ */
  await prisma.organization.create({
    data: {
      id: PARTNER.id,
      type: 'industry',
      name: PARTNER.name,
      legalName: PARTNER.legalName,
      sector: PARTNER.sector,
      about: PARTNER.about,
      industryInfo: {
        create: {
          orgSize: 'enterprise',
          sector: PARTNER.sector,
          website: 'https://nirvaha.example.in',
          yearEstablished: 2004,
          employeeCount: 2140,
          csrThemes: ['water', 'rural', 'education', 'health', 'environment'],
          geographies: ['Jharkhand', 'Odisha', 'Maharashtra'],
          technologyDomains: [
            'IoT & Telemetry',
            'LoRaWAN',
            'Water Systems',
            'Sensors & Instrumentation',
            'Embedded Systems',
            'Cloud & Data Platforms',
            'Solar & Power Electronics',
            'GIS',
          ],
          capabilities: [
            'hardware',
            'software',
            'manufacturing',
            'testing',
            'field-deployment',
            'logistics',
            'training',
          ],
          sdgPreferences: [6, 9, 11, 17],
          provenDomains: ['water', 'rural', 'energy'],
          fundingMin: 150000,
          fundingMax: 2500000,
          csrFinancialYear: 'FY 2026–27',
          csrAllocated: 12000000,
          csrPreferredCeiling: 2500000,
          onboardedAt: new Date(),
        },
      },
      locations: {
        create: [
          {
            kind: 'headquarters',
            label: 'Corporate office',
            state: 'Jharkhand',
            district: 'East Singhbhum',
            city: 'Jamshedpur',
            pincode: '831001',
            isPrimary: true,
          },
          {
            kind: 'plant',
            label: 'Instrumentation plant',
            state: 'Jharkhand',
            district: 'Ranchi',
            city: 'Ranchi',
            pincode: '834002',
          },
          {
            kind: 'branch',
            label: 'Eastern regional office',
            state: 'Odisha',
            district: 'Khordha',
            city: 'Bhubaneswar',
            pincode: '751024',
          },
        ],
      },
    },
  });

  /* -- demo accounts, one per surface --------------------------------- */
  const roleId = async (key: string) =>
    (await prisma.role.findUniqueOrThrow({ where: { key }, select: { id: true } })).id;

  // Student — fully onboarded, so /dashboard has real data on first sight.
  await prisma.user.create({
    data: {
      id: 'user-student',
      kind: 'citizen',
      status: 'active',
      displayName: 'Aisha Patel',
      email: 'student@jansetu.local',
      phone: '+919876543210',
      passwordHash,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: await roleId('student'), orgId: 'inst-bit-mesra' } },
      studentProfile: {
        create: {
          orgId: 'inst-bit-mesra',
          institutionName: 'Birla Institute of Technology, Mesra',
          degree: 'B.Tech',
          branch: 'Computer Science & Engineering',
          currentYear: 3,
          graduationYear: 2028,
          state: 'Jharkhand',
          district: 'Ranchi',
          skills: ['React', 'Node.js', 'IoT', 'Data Analysis', 'UI/UX'],
          interests: ['Sustainability', 'Public Health', 'Education'],
          onboardedAt: new Date(),
        },
      },
    },
  });
  devLogins.push('student@jansetu.local          Student · BIT Mesra, 3rd year');

  // Industry — primary contact of the verified partner above.
  await prisma.user.create({
    data: {
      id: 'user-industry',
      kind: 'staff',
      status: 'active',
      displayName: 'Rakesh Sinha',
      email: 'industry@jansetu.local',
      phone: '+919830011223',
      passwordHash,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: await roleId('industry_admin'), orgId: PARTNER.id } },
      orgMemberships: {
        create: {
          orgId: PARTNER.id,
          designation: 'Head of CSR & Sustainability',
          officialEmail: 'industry@jansetu.local',
          officialPhone: '+919830011223',
          isPrimaryContact: true,
        },
      },
    },
  });
  devLogins.push('industry@jansetu.local         Industry · Nirvaha Technologies');

  // Platform administrator — the account that reviews everyone else.
  await prisma.user.create({
    data: {
      id: 'user-admin',
      kind: 'admin',
      status: 'active',
      displayName: 'Platform Administrator',
      email: 'admin@jansetu.local',
      passwordHash,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: await roleId('admin') } },
    },
  });
  devLogins.push('admin@jansetu.local            Platform administrator');

  /* -- the public statistics series ----------------------------------- */
  for (const stat of YEAR_STATS) {
    await prisma.platformYearStat.create({ data: stat });
  }

  return { devLogins };
}
