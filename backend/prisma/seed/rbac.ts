import { PrismaClient, Surface } from '@prisma/client';

/**
 * The permission catalogue, and the roles that hold them.
 *
 * Government permissions are the closed union from
 * apps/web/src/lib/gov/types.ts, verbatim. Student and industry permissions
 * are namespaced (`student.*`, `industry.*`) rather than sharing the bare
 * keys, because two of them would otherwise collide with a different meaning:
 * `funding.approve` on the government side commits public money to a problem,
 * while an industry finance controller approving a commitment is an internal
 * sign-off. One key, two authorities, is how privilege escalation gets built
 * by accident.
 *
 * Roles carry a `surface` (where a holder lands after sign-in) and a `rank`
 * (which surface wins when someone holds several). Adding an audience later —
 * institute, NGO, mentor — is a row here plus a route group, and touches no
 * session, guard or token code.
 */

export const PERMISSIONS: Record<string, string> = {
  /* -- government ------------------------------------------------------- */
  'problem.validate': 'Validate or reject a citizen problem',
  'problem.route': 'Override the department a problem is routed to',
  'sponsorship.invite': 'Invite matched industries to sponsor a problem',
  'sponsorship.approve': 'Accept an industry sponsorship proposal',
  'funding.approve': 'Approve government funding for a problem',
  'officer.assign': 'Assign a problem to a delivery officer',
  'project.update': 'Update project progress and milestones',
  'settings.manage': 'Manage jurisdiction settings and priority weights',

  /* -- platform --------------------------------------------------------- */
  'account.verify': 'Review, approve or reject pending accounts',

  /* -- student ---------------------------------------------------------- */
  'student.project.create': 'Start a collaboration project',
  'student.team.manage': 'Form a team and invite collaborators',
  'student.application.submit': 'Apply to an opportunity or challenge',

  /* -- institute -------------------------------------------------------- */
  'institute.profile.manage': 'Edit the institution profile and academic structure',
  'institute.faculty.manage': 'Add faculty and place them in a department',
  'institute.student.manage': 'Verify the student roster and place students',
  'institute.team.manage': 'Form a team, assign students and assign a faculty guide',
  'institute.project.oversee': 'See every project the institution is carrying',
  'institute.submission.review': 'Approve a submitted milestone or ask for changes',
  'institute.report.view': 'Read institutional analytics',

  /* -- industry --------------------------------------------------------- */
  'industry.funding.commit': 'Commit CSR funding to a challenge',
  'industry.funding.approve': 'Give internal finance sign-off on a commitment',
  'industry.mentorship.assign': 'Assign an employee mentor to a student team',
  'industry.milestone.approve': 'Approve a delivery milestone and release a tranche',
  'industry.profile.manage': 'Edit the company profile the match engine reads',
  'industry.report.generate': 'Generate CSR and impact reports',
  'industry.messages.post': 'Post in a project message thread',
};

type RoleSeed = {
  label: string;
  surface: Surface;
  /** Highest rank wins when a user holds several roles. */
  rank: number;
  permissions: string[];
};

const GOV_BASE = ['problem.validate', 'problem.route', 'sponsorship.invite', 'officer.assign', 'project.update'];
const STUDENT_ALL = ['student.project.create', 'student.team.manage', 'student.application.submit'];
/**
 * What a faculty guide holds.
 *
 * Deliberately short of `institute_admin`: a guide runs the teams they were
 * given and signs off their work. They do not verify the roster, hire faculty
 * or edit the institution — those are the registrar's job, and handing them to
 * every lecturer is how an institution loses control of its own record.
 */
const INSTITUTE_GUIDE = [
  'institute.team.manage',
  'institute.project.oversee',
  'institute.submission.review',
  'institute.report.view',
];

const INDUSTRY_ALL = [
  'industry.funding.commit',
  'industry.mentorship.assign',
  'industry.milestone.approve',
  'industry.profile.manage',
  'industry.report.generate',
  'industry.messages.post',
];

export const ROLES: Record<string, RoleSeed> = {
  admin: {
    label: 'Platform administrator',
    surface: 'admin',
    rank: 100,
    permissions: Object.keys(PERMISSIONS),
  },

  gov_district: {
    label: 'Deputy Commissioner',
    surface: 'gov',
    rank: 44,
    permissions: [...GOV_BASE, 'sponsorship.approve', 'funding.approve', 'settings.manage'],
  },
  gov_block: {
    label: 'Block Development Officer',
    surface: 'gov',
    rank: 42,
    permissions: [...GOV_BASE, 'sponsorship.approve', 'funding.approve'],
  },
  gov_urban_body: {
    label: 'Urban Local Body Officer',
    surface: 'gov',
    rank: 41,
    permissions: [...GOV_BASE, 'sponsorship.approve'],
  },
  gov_panchayat: {
    label: 'Panchayat Secretary',
    surface: 'gov',
    rank: 40,
    permissions: GOV_BASE,
  },
  gov_field_officer: {
    label: 'Delivery Officer',
    surface: 'gov',
    rank: 38,
    permissions: ['project.update'],
  },

  industry_admin: {
    label: 'Industry partner — primary contact',
    surface: 'industry',
    rank: 32,
    permissions: [...INDUSTRY_ALL, 'industry.funding.approve'],
  },
  industry_user: {
    label: 'Industry partner',
    surface: 'industry',
    rank: 30,
    permissions: INDUSTRY_ALL,
  },

  institute_admin: {
    label: 'Institute — registrar / administrator',
    surface: 'institute',
    rank: 26,
    permissions: [
      ...INSTITUTE_GUIDE,
      'institute.profile.manage',
      'institute.faculty.manage',
      'institute.student.manage',
    ],
  },

  faculty: {
    label: 'Faculty',
    surface: 'institute',
    rank: 24,
    permissions: [...INSTITUTE_GUIDE, ...STUDENT_ALL],
  },

  student: {
    label: 'Student',
    surface: 'student',
    rank: 20,
    permissions: STUDENT_ALL,
  },

  citizen: {
    label: 'Citizen',
    surface: 'citizen',
    rank: 10,
    permissions: [],
  },
};

export async function seedRbac(prisma: PrismaClient): Promise<void> {
  for (const [key, label] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key },
      update: { label },
      create: { key, label },
    });
  }

  for (const [key, role] of Object.entries(ROLES)) {
    const row = await prisma.role.upsert({
      where: { key },
      update: { label: role.label, surface: role.surface, rank: role.rank },
      create: { key, label: role.label, surface: role.surface, rank: role.rank },
    });

    // Reset this role's permission set to exactly what's declared here.
    await prisma.rolePermission.deleteMany({ where: { roleId: row.id } });
    if (role.permissions.length) {
      const perms = await prisma.permission.findMany({
        where: { key: { in: role.permissions } },
        select: { id: true },
      });
      await prisma.rolePermission.createMany({
        data: perms.map((p) => ({ roleId: row.id, permissionId: p.id })),
      });
    }
  }
}
