import "server-only";
import { BACKEND } from "./proxy-handler";

/**
 * The vocabularies every signup form fills its dropdowns from.
 *
 * Fetched from the backend rather than duplicated here, because the server
 * validates against exactly these lists — a form built from a second copy is a
 * form that eventually offers an option the API rejects.
 *
 * Read on the server and passed into the client form as props, so the wizard
 * opens with its options already present instead of flashing empty selects.
 */

export type Taxonomy = {
  degrees: string[];
  branches: string[];
  skills: string[];
  interests: string[];
  states: string[];
  districtsByState: Record<string, string[]>;
  govBodyTypes: { key: string; label: string }[];
  govAccessLevels: { key: string; label: string; detail: string }[];
  orgSizes: { key: string; label: string }[];
  sectors: string[];
  csrDomains: { key: string; label: string }[];
  capabilities: { key: string; label: string }[];
  technologyDomains: string[];
  sdgs: { number: number; short: string }[];
  institutionTypes: { key: string; label: string }[];
  programLevels: { key: string; label: string }[];
};

export type Institution = {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  emailDomains: string[];
};

export type JurisdictionNode = {
  id: string;
  level: "state" | "district" | "block" | "panchayat" | "ulb";
  name: string;
  parentId: string | null;
};

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/registry/${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export const EMPTY_TAXONOMY: Taxonomy = {
  degrees: [],
  branches: [],
  skills: [],
  interests: [],
  states: [],
  districtsByState: {},
  govBodyTypes: [],
  govAccessLevels: [],
  orgSizes: [],
  sectors: [],
  csrDomains: [],
  capabilities: [],
  technologyDomains: [],
  sdgs: [],
  institutionTypes: [],
  programLevels: [],
};

export const fetchTaxonomy = () => get<Taxonomy>("taxonomy", EMPTY_TAXONOMY);
export const fetchInstitutions = () => get<Institution[]>("institutions", []);
export const fetchJurisdictions = () => get<JurisdictionNode[]>("jurisdictions", []);
export const fetchDepartments = () =>
  get<{ id: string; name: string; shortName: string }[]>("departments", []);
