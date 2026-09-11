import { describe, expect, it } from 'vitest';
import { PERMISSIONS, ROLES } from '../../../prisma/seed/rbac';

/**
 * The institute role catalogue.
 *
 * These are invariants rather than behaviour: the e2e suite already proves that
 * a guide cannot verify a student, but it proves it through HTTP, and the thing
 * that would actually break it is somebody adding a permission to the wrong
 * array in `rbac.ts`. That is a one-line mistake with no obvious symptom, so it
 * is worth a test that fails on the line itself.
 */
describe('institute roles', () => {
  const admin = ROLES.institute_admin;
  const faculty = ROLES.faculty;

  it('both institute roles land on the institute surface', () => {
    expect(admin.surface).toBe('institute');
    expect(faculty.surface).toBe('institute');
  });

  it('an administrator outranks a guide, so a person who is both lands as an administrator', () => {
    expect(admin.rank).toBeGreaterThan(faculty.rank);
  });

  it('every permission a role claims exists in the catalogue', () => {
    for (const [key, role] of Object.entries(ROLES)) {
      for (const permission of role.permissions) {
        expect(PERMISSIONS, `${key} claims an unknown permission "${permission}"`).toHaveProperty(
          permission,
        );
      }
    }
  });

  it('a guide may run their teams and sign off their work', () => {
    expect(faculty.permissions).toEqual(
      expect.arrayContaining([
        'institute.team.manage',
        'institute.submission.review',
        'institute.project.oversee',
        'institute.report.view',
      ]),
    );
  });

  /*
   * The whole point of having two roles. A lecturer who could verify the
   * roster, hire faculty or rewrite the institution is not a lecturer — and
   * handing those to every guide is how an institution loses control of its
   * own record.
   */
  it.each(['institute.student.manage', 'institute.faculty.manage', 'institute.profile.manage'])(
    'a guide does not hold %s',
    (permission) => {
      expect(faculty.permissions).not.toContain(permission);
      expect(admin.permissions).toContain(permission);
    },
  );

  it('no institute role holds a government or industry permission', () => {
    for (const role of [admin, faculty]) {
      for (const permission of role.permissions) {
        expect(permission.startsWith('industry.')).toBe(false);
        expect(['funding.approve', 'problem.validate', 'account.verify']).not.toContain(permission);
      }
    }
  });

  it('the administrator holds everything a guide does', () => {
    for (const permission of faculty.permissions.filter((p) => p.startsWith('institute.'))) {
      expect(admin.permissions).toContain(permission);
    }
  });
});
