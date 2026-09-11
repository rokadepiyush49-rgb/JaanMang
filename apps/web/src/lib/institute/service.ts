/**
 * The data access boundary for the institute portal.
 *
 * Unlike `lib/industry/service.ts`, there is no fixture behind any of this —
 * every function below is a real call to `/api/v1/institute/*`, which is why
 * there is no `USING_MOCK_DATA` flag to flip. The backend was written first for
 * exactly that reason: a roster of named students rendered from a hard-coded
 * array teaches nothing about whether the permissions work.
 *
 * Screens never call `backend` directly — they go through these, so a route
 * that moves is one edit rather than twenty.
 */
import { backend } from "@/lib/api/client";
import type {
  Analytics,
  Department,
  FacultyMember,
  InstituteApplication,
  InstituteProfile,
  Notification,
  Opportunity,
  Overview,
  Partner,
  Project,
  ProjectDetail,
  RosterStudent,
  Submission,
  Team,
  TeamDetail,
} from "./types";

const q = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== "all") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
};

export const InstituteApi = {
  /* -- dashboard ------------------------------------------------------- */
  overview: () => backend.get<Overview>("institute/overview"),
  analytics: () => backend.get<Analytics>("institute/analytics"),

  /* -- profile --------------------------------------------------------- */
  profile: () => backend.get<InstituteProfile>("institute/profile"),
  updateProfile: (body: Partial<InstituteProfile>) =>
    backend.patch<InstituteProfile>("institute/profile", body),

  /* -- academic structure ---------------------------------------------- */
  departments: () => backend.get<Department[]>("institute/departments"),
  createDepartment: (body: {
    name: string;
    code: string;
    hodFacultyId?: string | null;
    facultyStrength?: number | null;
  }) => backend.post<Department[]>("institute/departments", body),
  updateDepartment: (
    id: string,
    body: { name?: string; code?: string; hodFacultyId?: string | null; facultyStrength?: number | null },
  ) => backend.patch<Department[]>(`institute/departments/${id}`, body),
  deleteDepartment: (id: string) => backend.del<Department[]>(`institute/departments/${id}`),

  createProgram: (body: {
    departmentId: string;
    name: string;
    level: string;
    durationYears: number;
    intake?: number | null;
    eligibility?: string;
  }) => backend.post<Department[]>("institute/programs", body),
  updateProgram: (id: string, body: Record<string, unknown>) =>
    backend.patch<Department[]>(`institute/programs/${id}`, body),
  deleteProgram: (id: string) => backend.del<Department[]>(`institute/programs/${id}`),

  /* -- roster ---------------------------------------------------------- */
  students: (filters: {
    q?: string;
    departmentId?: string;
    programId?: string;
    year?: number;
    status?: string;
  } = {}) => backend.get<RosterStudent[]>(`institute/students${q(filters)}`),
  placeStudent: (
    userId: string,
    body: { departmentId?: string | null; programId?: string | null; verified?: boolean },
  ) => backend.patch<{ ok: boolean }>(`institute/students/${userId}`, body),

  /* -- faculty --------------------------------------------------------- */
  faculty: () => backend.get<FacultyMember[]>("institute/faculty"),
  createFaculty: (body: {
    fullName: string;
    email: string;
    designation: string;
    departmentId?: string | null;
    expertise?: string[];
    officialPhone?: string;
    guideCapacity?: number;
    password: string;
  }) => backend.post<FacultyMember[]>("institute/faculty", body),
  updateFaculty: (
    userId: string,
    body: {
      designation?: string;
      departmentId?: string | null;
      expertise?: string[];
      guideCapacity?: number;
    },
  ) => backend.patch<FacultyMember[]>(`institute/faculty/${userId}`, body),
  removeFaculty: (userId: string) => backend.del<FacultyMember[]>(`institute/faculty/${userId}`),

  /* -- teams ----------------------------------------------------------- */
  teams: () => backend.get<Team[]>("institute/teams"),
  team: (id: string) => backend.get<TeamDetail>(`institute/teams/${id}`),
  createTeam: (body: {
    name: string;
    title?: string;
    departmentId?: string | null;
    problemId?: string | null;
    facultyId?: string | null;
    memberIds?: string[];
    skills?: string[];
  }) => backend.post<{ id: string }>("institute/teams", body),
  updateTeam: (id: string, body: Record<string, unknown>) =>
    backend.patch<{ ok: boolean }>(`institute/teams/${id}`, body),
  /** Assigning the faculty guide. `null` clears it. */
  assignGuide: (id: string, facultyId: string | null) =>
    backend.post<{ ok: boolean }>(`institute/teams/${id}/guide`, { facultyId }),
  addMembers: (id: string, studentIds: string[]) =>
    backend.post<{ added: number }>(`institute/teams/${id}/members`, { studentIds }),
  removeMember: (id: string, userId: string) =>
    backend.del<{ ok: boolean }>(`institute/teams/${id}/members/${userId}`),

  /* -- delivery -------------------------------------------------------- */
  projects: () => backend.get<Project[]>("institute/projects"),
  project: (id: string) => backend.get<ProjectDetail>(`institute/projects/${id}`),
  submissions: () => backend.get<Submission[]>("institute/submissions"),
  approve: (id: string, note?: string) =>
    backend.post<{ ok: boolean }>(`institute/submissions/${id}/approve`, { note }),
  requestChanges: (id: string, note: string) =>
    backend.post<{ ok: boolean }>(`institute/submissions/${id}/request-changes`, { note }),

  /* -- outward --------------------------------------------------------- */
  applications: () => backend.get<InstituteApplication[]>("institute/applications"),
  opportunities: () => backend.get<Opportunity[]>("institute/opportunities"),
  partners: () => backend.get<Partner[]>("institute/partners"),

  notifications: () => backend.get<Notification[]>("institute/notifications"),
  markNotificationsRead: () => backend.post<{ ok: boolean }>("institute/notifications/read"),
};
