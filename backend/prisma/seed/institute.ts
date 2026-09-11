import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

/**
 * The institute surface, seeded against BIT Mesra — the institution the student
 * demo account already belongs to, so the two surfaces show the same people
 * from opposite sides. The student sees "my team"; the registrar sees the same
 * team in a roster of nine, with a guide, a project and a milestone waiting on
 * a decision.
 *
 * The data is deliberately imperfect. Two students are unverified, one team has
 * no guide and one has no members, and one milestone sits in
 * `changes_requested`. A seed where every queue is empty makes a dashboard look
 * finished and proves nothing about whether it works.
 *
 * Runs after `seedGov` (problems) and `seedOnboarding` (the institution register
 * and the student account).
 */

const DEV_PASSWORD = 'jansetu-dev';
const ORG = 'inst-bit-mesra';

const DEPARTMENTS = [
  { id: 'dept-cse', code: 'CSE', name: 'Computer Science & Engineering', strength: 42 },
  { id: 'dept-ece', code: 'ECE', name: 'Electronics & Communication Engineering', strength: 36 },
  { id: 'dept-civ', code: 'CIVIL', name: 'Civil Engineering', strength: 28 },
];

const PROGRAMS = [
  { id: 'prog-btech-cse', departmentId: 'dept-cse', name: 'B.Tech Computer Science & Engineering', level: 'undergraduate' as const, durationYears: 4, intake: 180 },
  { id: 'prog-mtech-cse', departmentId: 'dept-cse', name: 'M.Tech Data Science', level: 'postgraduate' as const, durationYears: 2, intake: 30 },
  { id: 'prog-btech-ece', departmentId: 'dept-ece', name: 'B.Tech Electronics & Communication', level: 'undergraduate' as const, durationYears: 4, intake: 150 },
  { id: 'prog-btech-civ', departmentId: 'dept-civ', name: 'B.Tech Civil Engineering', level: 'undergraduate' as const, durationYears: 4, intake: 120 },
  { id: 'prog-dip-civ', departmentId: 'dept-civ', name: 'Diploma in Water Resources', level: 'diploma' as const, durationYears: 3, intake: 60 },
];

const FACULTY = [
  {
    id: 'fac-meena',
    name: 'Dr. Meena Kujur',
    email: 'meena.kujur@bitmesra.ac.in',
    designation: 'Associate Professor',
    departmentId: 'dept-cse',
    expertise: ['IoT', 'Embedded Systems', 'Data Engineering'],
    capacity: 5,
    hodOf: 'dept-cse',
  },
  {
    id: 'fac-arun',
    name: 'Prof. Arun Mahto',
    email: 'arun.mahto@bitmesra.ac.in',
    designation: 'Professor',
    departmentId: 'dept-civ',
    expertise: ['Water Resources', 'Structural Assessment', 'Hydrology'],
    capacity: 4,
    hodOf: 'dept-civ',
  },
  {
    id: 'fac-sneha',
    name: 'Dr. Sneha Bose',
    email: 'sneha.bose@bitmesra.ac.in',
    designation: 'Assistant Professor',
    departmentId: 'dept-ece',
    expertise: ['Sensors & Instrumentation', 'LoRaWAN', 'Power Electronics'],
    capacity: 3,
    hodOf: 'dept-ece',
  },
  {
    id: 'fac-ravi',
    name: 'Dr. Ravi Oraon',
    email: 'ravi.oraon@bitmesra.ac.in',
    designation: 'Assistant Professor',
    departmentId: 'dept-cse',
    expertise: ['Machine Learning', 'GIS'],
    capacity: 4,
    hodOf: null,
  },
];

type StudentSeed = {
  id: string;
  name: string;
  email: string;
  branch: string;
  departmentId: string;
  programId: string;
  year: number;
  grad: number;
  enrollment: string;
  skills: string[];
  verified: boolean;
};

const STUDENTS: StudentSeed[] = [
  { id: 'stu-rohit', name: 'Rohit Mahato', email: 'rohit.mahato@bitmesra.ac.in', branch: 'Computer Science & Engineering', departmentId: 'dept-cse', programId: 'prog-btech-cse', year: 4, grad: 2027, enrollment: 'BTECH/10231/22', skills: ['React', 'Node.js', 'PostgreSQL'], verified: true },
  { id: 'stu-neha', name: 'Neha Tirkey', email: 'neha.tirkey@bitmesra.ac.in', branch: 'Electronics & Communication', departmentId: 'dept-ece', programId: 'prog-btech-ece', year: 3, grad: 2028, enrollment: 'BTECH/10244/23', skills: ['Embedded C', 'LoRaWAN', 'PCB Design'], verified: true },
  { id: 'stu-imran', name: 'Imran Ansari', email: 'imran.ansari@bitmesra.ac.in', branch: 'Civil Engineering', departmentId: 'dept-civ', programId: 'prog-btech-civ', year: 4, grad: 2027, enrollment: 'BTECH/10108/22', skills: ['AutoCAD', 'Structural Analysis', 'Survey'], verified: true },
  { id: 'stu-priya', name: 'Priya Kumari', email: 'priya.kumari@bitmesra.ac.in', branch: 'Computer Science & Engineering', departmentId: 'dept-cse', programId: 'prog-btech-cse', year: 3, grad: 2028, enrollment: 'BTECH/10290/23', skills: ['Python', 'Data Analysis', 'Flutter'], verified: true },
  { id: 'stu-sameer', name: 'Sameer Lakra', email: 'sameer.lakra@bitmesra.ac.in', branch: 'Civil Engineering', departmentId: 'dept-civ', programId: 'prog-dip-civ', year: 2, grad: 2029, enrollment: 'DIP/2044/24', skills: ['Survey', 'GIS'], verified: true },
  { id: 'stu-anita', name: 'Anita Horo', email: 'anita.horo@bitmesra.ac.in', branch: 'Electronics & Communication', departmentId: 'dept-ece', programId: 'prog-btech-ece', year: 2, grad: 2029, enrollment: 'BTECH/10331/24', skills: ['Sensors', 'Arduino'], verified: true },
  { id: 'stu-vikas', name: 'Vikas Singh', email: 'vikas.singh@bitmesra.ac.in', branch: 'Computer Science & Engineering', departmentId: 'dept-cse', programId: 'prog-mtech-cse', year: 1, grad: 2028, enrollment: 'MTECH/3011/26', skills: ['Machine Learning', 'PyTorch'], verified: true },
  // Two the registrar has not confirmed yet — the roster's working queue.
  { id: 'stu-farah', name: 'Farah Khatoon', email: 'farah.khatoon@gmail.com', branch: 'Computer Science & Engineering', departmentId: 'dept-cse', programId: 'prog-btech-cse', year: 2, grad: 2029, enrollment: 'BTECH/10355/24', skills: ['Java', 'Android'], verified: false },
  { id: 'stu-dinesh', name: 'Dinesh Munda', email: 'dinesh.munda@bitmesra.ac.in', branch: 'Civil Engineering', departmentId: 'dept-civ', programId: 'prog-btech-civ', year: 3, grad: 2028, enrollment: 'BTECH/10187/23', skills: ['Concrete Technology'], verified: false },
];

export async function seedInstitute(prisma: PrismaClient): Promise<{ devLogins: string[] }> {
  const passwordHash = await argon2.hash(DEV_PASSWORD, { type: argon2.argon2id });
  const devLogins: string[] = [];
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
  const daysAhead = (n: number) => new Date(now.getTime() + n * 86_400_000);

  const roleId = async (key: string) =>
    (await prisma.role.findUniqueOrThrow({ where: { key }, select: { id: true } })).id;

  /* -- the institution is now administered ------------------------------ */
  await prisma.institutionProfile.update({
    where: { orgId: ORG },
    data: {
      institutionType: 'university',
      district: 'Ranchi',
      website: 'https://bitmesra.ac.in',
      officialEmail: 'registrar@bitmesra.ac.in',
      officialPhone: '+916512275444',
      establishedYear: 1955,
      onboardedAt: daysAgo(60),
    },
  });
  await prisma.organization.update({
    where: { id: ORG },
    data: {
      about:
        'A deemed university at Mesra, Ranchi, running engineering, science and management programmes. Its embedded systems, water resources and geoinformatics groups work with district administrations across Jharkhand.',
    },
  });
  await prisma.accountVerification.create({
    data: {
      subjectType: 'organization',
      subjectId: ORG,
      status: 'verified',
      requestedRoleKey: 'institute_admin',
      reviewedAt: daysAgo(58),
      signals: { emailDomainClass: 'academic', matchesRegisteredDomain: true },
    },
  });

  /* -- departments and programmes -------------------------------------- */
  for (const d of DEPARTMENTS) {
    await prisma.instituteDepartment.create({
      data: { id: d.id, orgId: ORG, name: d.name, code: d.code, facultyStrength: d.strength },
    });
  }
  for (const p of PROGRAMS) {
    await prisma.program.create({ data: { ...p, orgId: ORG, status: 'active' } });
  }

  /* -- the registrar ---------------------------------------------------- */
  await prisma.user.create({
    data: {
      id: 'user-institute',
      kind: 'staff',
      status: 'active',
      displayName: 'Dr. Sunita Bhengra',
      email: 'institute@jansetu.local',
      phone: '+919431122334',
      passwordHash,
      emailVerifiedAt: now,
      roles: { create: { roleId: await roleId('institute_admin'), orgId: ORG } },
      orgMemberships: {
        create: {
          orgId: ORG,
          designation: 'Dean, Student Innovation & Outreach',
          officialEmail: 'institute@jansetu.local',
          officialPhone: '+919431122334',
          isPrimaryContact: true,
        },
      },
    },
  });
  devLogins.push('institute@jansetu.local        Institute · BIT Mesra (registrar)');

  /* -- faculty ---------------------------------------------------------- */
  const facultyRole = await roleId('faculty');
  for (const f of FACULTY) {
    await prisma.user.create({
      data: {
        id: f.id,
        kind: 'staff',
        status: 'active',
        displayName: f.name,
        email: f.email,
        passwordHash,
        emailVerifiedAt: now,
        roles: { create: { roleId: facultyRole, orgId: ORG } },
        orgMemberships: {
          create: { orgId: ORG, designation: f.designation, officialEmail: f.email },
        },
        faculty: {
          create: {
            orgId: ORG,
            designation: f.designation,
            departmentId: f.departmentId,
            expertise: f.expertise,
            officialEmail: f.email,
            guideCapacity: f.capacity,
          },
        },
      },
    });
    if (f.hodOf) {
      await prisma.instituteDepartment.update({
        where: { id: f.hodOf },
        data: { hodFacultyId: f.id },
      });
    }
  }
  devLogins.push('meena.kujur@bitmesra.ac.in     Faculty · CSE, guides the Jal Setu team');

  /* -- the roster ------------------------------------------------------- */
  const studentRole = await roleId('student');
  for (const s of STUDENTS) {
    await prisma.user.create({
      data: {
        id: s.id,
        kind: 'citizen',
        status: 'active',
        displayName: s.name,
        email: s.email,
        passwordHash,
        roles: { create: { roleId: studentRole, orgId: ORG } },
        studentProfile: {
          create: {
            orgId: ORG,
            institutionName: 'Birla Institute of Technology, Mesra',
            degree: s.programId.startsWith('prog-mtech')
              ? 'M.Tech'
              : s.programId.startsWith('prog-dip')
                ? 'Diploma'
                : 'B.Tech',
            branch: s.branch,
            currentYear: s.year,
            graduationYear: s.grad,
            enrollmentNo: s.enrollment,
            state: 'Jharkhand',
            district: 'Ranchi',
            skills: s.skills,
            interests: ['Civic technology'],
            departmentId: s.departmentId,
            programId: s.programId,
            verifiedAt: s.verified ? daysAgo(40) : null,
            verifiedById: s.verified ? 'user-institute' : null,
            onboardedAt: daysAgo(45),
          },
        },
      },
    });
  }

  // The existing demo student joins the roster properly.
  await prisma.studentProfile.update({
    where: { userId: 'user-student' },
    data: {
      departmentId: 'dept-cse',
      programId: 'prog-btech-cse',
      verifiedAt: daysAgo(40),
      verifiedById: 'user-institute',
    },
  });

  /* -- teams ------------------------------------------------------------ */
  const member = (userId: string, firstName: string, year: number, discipline: string) => ({
    userId,
    firstName,
    year: `Year ${year}`,
    discipline,
  });

  const jalSetu = await prisma.studentTeam.create({
    data: {
      id: 'team-jal-setu',
      orgId: ORG,
      name: 'Jal Setu',
      title: 'Low-cost telemetry for rural water supply continuity',
      departmentId: 'dept-cse',
      facultyId: 'fac-meena',
      problemId: 'P-1042',
      status: 'active',
      stage: 'prototype',
      skills: ['IoT', 'React', 'Embedded C', 'PostgreSQL'],
      memberCount: 4,
      approvedAt: daysAgo(38),
      approvedById: 'user-institute',
      mentorRolesWanted: ['hardware', 'field-deployment'],
      members: {
        create: [
          member('user-student', 'Aisha', 3, 'Computer Science & Engineering'),
          member('stu-rohit', 'Rohit', 4, 'Computer Science & Engineering'),
          member('stu-neha', 'Neha', 3, 'Electronics & Communication'),
          member('stu-anita', 'Anita', 2, 'Electronics & Communication'),
        ],
      },
    },
  });

  const setuBandh = await prisma.studentTeam.create({
    data: {
      id: 'team-setu-bandh',
      orgId: ORG,
      name: 'Setu Bandh',
      title: 'Load assessment and repair plan for the Kanchi stream bridge deck',
      departmentId: 'dept-civ',
      facultyId: 'fac-arun',
      problemId: 'P-1012',
      status: 'active',
      stage: 'research',
      skills: ['Structural Analysis', 'Survey', 'AutoCAD'],
      memberCount: 3,
      approvedAt: daysAgo(24),
      approvedById: 'user-institute',
      members: {
        create: [
          member('stu-imran', 'Imran', 4, 'Civil Engineering'),
          member('stu-sameer', 'Sameer', 2, 'Civil Engineering'),
          member('stu-dinesh', 'Dinesh', 3, 'Civil Engineering'),
        ],
      },
    },
  });

  // A team with members and no guide — the dashboard's first "needs you" row.
  await prisma.studentTeam.create({
    data: {
      id: 'team-roshni',
      orgId: ORG,
      name: 'Roshni',
      title: 'Solar street lighting reliability at Booty Basti',
      departmentId: 'dept-ece',
      problemId: 'P-1051',
      status: 'forming',
      stage: 'discovery',
      skills: ['Solar', 'Power Electronics'],
      memberCount: 2,
      members: {
        create: [
          member('stu-priya', 'Priya', 3, 'Computer Science & Engineering'),
          member('stu-vikas', 'Vikas', 1, 'Computer Science & Engineering'),
        ],
      },
    },
  });

  // A team with a guide and nobody in it — the second queue.
  await prisma.studentTeam.create({
    data: {
      id: 'team-swachh',
      orgId: ORG,
      name: 'Swachh Kanke',
      title: 'Waste collection route tracking for ward 4',
      departmentId: 'dept-cse',
      facultyId: 'fac-ravi',
      status: 'forming',
      stage: 'discovery',
      skills: ['GIS', 'Mobile'],
      memberCount: 0,
    },
  });

  // One finished, so the analytics have a completion to divide by.
  await prisma.studentTeam.create({
    data: {
      id: 'team-vidyut',
      orgId: ORG,
      name: 'Vidyut',
      title: 'Power backup sizing for Nagri PHC delivery room',
      departmentId: 'dept-ece',
      facultyId: 'fac-sneha',
      problemId: 'P-1003',
      status: 'completed',
      stage: 'impact',
      skills: ['Power Electronics', 'Sensors'],
      memberCount: 3,
      approvedAt: daysAgo(180),
      approvedById: 'user-institute',
      submittedAt: daysAgo(30),
      completedAt: daysAgo(21),
      members: {
        create: [
          member('stu-neha', 'Neha', 3, 'Electronics & Communication'),
          member('stu-anita', 'Anita', 2, 'Electronics & Communication'),
          member('stu-vikas', 'Vikas', 1, 'Computer Science & Engineering'),
        ],
      },
    },
  });

  /* -- projects and the milestone trail --------------------------------- */
  await prisma.project.create({
    data: {
      id: 'proj-jal-setu',
      kind: 'industry',
      problemId: 'P-1042',
      teamId: jalSetu.id,
      universityId: ORG,
      title: 'Jal Setu — water supply continuity telemetry',
      phase: 'implementation',
      stage: 'prototype',
      progress: 55,
      budget: 480000,
      spent: 214000,
      governmentBody: 'Nagri Gram Panchayat',
      startedAt: daysAgo(96),
      dueAt: daysAhead(74),
      milestones: {
        create: [
          {
            label: 'Problem study and field survey',
            detail: 'Three villages surveyed, 41 households interviewed, supply log reconstructed.',
            status: 'complete',
            percent: 20,
            dueAt: daysAgo(72),
            completedAt: daysAgo(70),
            deliverables: ['Field survey report', 'Supply interruption log'],
            reviewedById: 'fac-meena',
            reviewNote: 'Accepted. The interruption log is the strongest part.',
          },
          {
            label: 'Sensor selection and bench test',
            detail: 'Flow and pressure sensing shortlisted and tested against a bench rig.',
            status: 'complete',
            percent: 40,
            dueAt: daysAgo(44),
            completedAt: daysAgo(41),
            deliverables: ['Bill of materials', 'Bench test results'],
            reviewedById: 'fac-meena',
          },
          {
            label: 'Prototype node — field build',
            detail: 'Two telemetry nodes assembled and installed on the Nagri feeder line.',
            status: 'active',
            percent: 60,
            dueAt: daysAhead(6),
            deliverables: ['Enclosure drawings', 'Firmware v0.4', 'Installation photographs'],
            // The submission the dashboard opens on.
            awaitingReview: true,
          },
          {
            label: 'Two-week continuous run',
            status: 'pending',
            percent: 80,
            dueAt: daysAhead(34),
            deliverables: [],
          },
          {
            label: 'Handover to the panchayat',
            status: 'pending',
            percent: 100,
            dueAt: daysAhead(74),
            deliverables: [],
          },
        ],
      },
    },
  });

  await prisma.project.create({
    data: {
      id: 'proj-setu-bandh',
      kind: 'gov',
      problemId: 'P-1012',
      teamId: setuBandh.id,
      universityId: ORG,
      title: 'Kanchi stream bridge — load assessment',
      phase: 'planning',
      stage: 'research',
      progress: 25,
      budget: 160000,
      spent: 38000,
      governmentBody: 'Ranchi Block Office',
      startedAt: daysAgo(40),
      dueAt: daysAhead(50),
      milestones: {
        create: [
          {
            label: 'Site survey and crack mapping',
            detail: 'Deck surveyed, crack widths logged against chainage.',
            status: 'complete',
            percent: 25,
            dueAt: daysAgo(18),
            completedAt: daysAgo(16),
            deliverables: ['Crack map', 'Photographic record'],
            reviewedById: 'fac-arun',
          },
          {
            label: 'Load model and restriction recommendation',
            detail: 'Finite element model of the deck under current restriction.',
            // Returned to the team — the other half of a review system.
            status: 'changes_requested',
            percent: 50,
            dueAt: daysAhead(4),
            deliverables: ['Draft load model'],
            reviewedById: 'fac-arun',
            reviewNote:
              'The model assumes an intact soffit. Re-run it with the observed section loss before this can be signed off.',
          },
          {
            label: 'Repair specification',
            status: 'pending',
            percent: 80,
            dueAt: daysAhead(36),
            deliverables: [],
          },
        ],
      },
    },
  });

  await prisma.project.create({
    data: {
      id: 'proj-vidyut',
      kind: 'gov',
      problemId: 'P-1003',
      teamId: 'team-vidyut',
      universityId: ORG,
      title: 'Nagri PHC — delivery room power backup',
      phase: 'completed',
      stage: 'impact',
      progress: 100,
      budget: 220000,
      spent: 207500,
      governmentBody: 'Nagri Gram Panchayat',
      startedAt: daysAgo(210),
      dueAt: daysAgo(24),
      milestones: {
        create: [
          { label: 'Load audit', status: 'complete', percent: 30, completedAt: daysAgo(160), deliverables: ['Load audit'], reviewedById: 'fac-sneha' },
          { label: 'Battery and inverter sizing', status: 'complete', percent: 65, completedAt: daysAgo(96), deliverables: ['Sizing note'], reviewedById: 'fac-sneha' },
          { label: 'Install and handover', status: 'complete', percent: 100, completedAt: daysAgo(24), deliverables: ['Commissioning certificate'], reviewedById: 'user-institute' },
        ],
      },
    },
  });

  /* -- applications ----------------------------------------------------- */
  await prisma.application.createMany({
    data: [
      { studentId: 'user-student', teamId: jalSetu.id, opportunityRef: 'Nirvaha CSR — Water telemetry grant', status: 'shortlisted', submittedAt: daysAgo(20) },
      { studentId: 'stu-imran', teamId: setuBandh.id, opportunityRef: 'Jharkhand Innovation Challenge 2026', status: 'under_review', submittedAt: daysAgo(9) },
      { studentId: 'stu-priya', opportunityRef: 'Smart India Hackathon — internal round', status: 'submitted', submittedAt: daysAgo(3) },
      { studentId: 'stu-neha', teamId: 'team-vidyut', opportunityRef: 'Nirvaha summer internship', status: 'accepted', submittedAt: daysAgo(120), decidedAt: daysAgo(104) },
      { studentId: 'stu-vikas', opportunityRef: 'State fellowship — rural data', status: 'rejected', submittedAt: daysAgo(70), decidedAt: daysAgo(52) },
      { studentId: 'stu-rohit', teamId: jalSetu.id, opportunityRef: 'District pilot funding — Ranchi', status: 'draft' },
    ],
  });

  /* -- notifications ---------------------------------------------------- */
  await prisma.notification.createMany({
    data: [
      {
        userId: 'user-institute',
        kind: 'submission',
        title: 'Jal Setu submitted a milestone',
        detail: 'Prototype node — field build is waiting on your decision.',
        actionLabel: 'Review',
        actionHref: '/institute/submissions',
        createdAt: daysAgo(1),
      },
      {
        userId: 'user-institute',
        kind: 'roster',
        title: 'Two students are awaiting verification',
        detail: 'Farah Khatoon and Dinesh Munda claimed BIT Mesra.',
        actionLabel: 'Open the roster',
        actionHref: '/institute/students?status=unverified',
        createdAt: daysAgo(2),
      },
      {
        userId: 'user-institute',
        kind: 'team',
        title: 'Roshni has no faculty guide',
        detail: 'The team has two members and has been forming for nine days.',
        actionLabel: 'Assign a guide',
        actionHref: '/institute/teams/team-roshni',
        createdAt: daysAgo(4),
      },
      {
        userId: 'user-institute',
        kind: 'partner',
        title: 'Nirvaha Technologies shortlisted Jal Setu',
        detail: 'A CSR commitment against the Nagri water supply cluster is under review.',
        read: true,
        createdAt: daysAgo(19),
      },
    ],
  });

  return { devLogins };
}
