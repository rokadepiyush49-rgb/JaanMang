import { PrismaClient } from '@prisma/client';

/**
 * The permission catalogue and the roles that hold them.
 *
 * `PERMISSIONS` is the closed union from apps/web/src/lib/gov/types.ts, verbatim
 * — the server now enforces what `rbac.ts#can()` only hinted at. Industry and
 * student permissions are added by their own stages.
 *
 * Roles map onto the three government tiers the fixtures use: a Nagri panchayat
 * secretary, a Ranchi BDO, a Ranchi DC — each with exactly the permission set
 * the `GOV_USERS` fixture granted that person.
 */

export const PERMISSIONS: Record<string, string> = {
  'problem.validate': 'Validate or reject a citizen problem',
  'problem.route': 'Override the department a problem is routed to',
  'sponsorship.invite': 'Invite matched industries to sponsor a problem',
  'sponsorship.approve': 'Accept an industry sponsorship proposal',
  'funding.approve': 'Approve government funding for a problem',
  'officer.assign': 'Assign a problem to a delivery officer',
  'project.update': 'Update project progress and milestones',
  'settings.manage': 'Manage jurisdiction settings and priority weights',
};

export const ROLES: Record<string, { label: string; permissions: string[] }> = {
  admin: {
    label: 'Platform administrator',
    permissions: Object.keys(PERMISSIONS),
  },
  gov_panchayat: {
    label: 'Panchayat Secretary',
    permissions: [
      'problem.validate',
      'problem.route',
      'sponsorship.invite',
      'officer.assign',
      'project.update',
    ],
  },
  gov_block: {
    label: 'Block Development Officer',
    permissions: [
      'problem.validate',
      'problem.route',
      'sponsorship.invite',
      'sponsorship.approve',
      'funding.approve',
      'officer.assign',
      'project.update',
    ],
  },
  gov_district: {
    label: 'Deputy Commissioner',
    permissions: [
      'problem.validate',
      'problem.route',
      'sponsorship.invite',
      'sponsorship.approve',
      'funding.approve',
      'officer.assign',
      'project.update',
      'settings.manage',
    ],
  },
  gov_field_officer: {
    label: 'Delivery Officer',
    permissions: ['project.update'],
  },
  // Placeholders — populated by the industry / collaboration stages.
  citizen: { label: 'Citizen', permissions: [] },
  student: { label: 'Student', permissions: [] },
  faculty: { label: 'Faculty', permissions: [] },
  industry_user: { label: 'Industry partner', permissions: [] },
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
      update: { label: role.label },
      create: { key, label: role.label },
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
