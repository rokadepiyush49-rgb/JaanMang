/**
 * The wire shape of a problem — deliberately identical to the `Problem` /
 * `RankedProblem` types in apps/web/src/lib/gov/types.ts, so the web service
 * layer swaps its mock return for a `fetch` and every `/gov` screen renders
 * unchanged.
 *
 * Dates are ISO strings; money is a plain number of rupees.
 */

export type ProblemCategory =
  | 'water'
  | 'roads'
  | 'drainage'
  | 'streetlight'
  | 'waste'
  | 'bridge'
  | 'sanitation'
  | 'school'
  | 'health';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type Stage =
  | 'reported'
  | 'ai_processed'
  | 'validated'
  | 'prioritised'
  | 'sponsorship'
  | 'funded'
  | 'assigned'
  | 'implementation'
  | 'verification'
  | 'impact';

export type ProblemStatus =
  | 'pending_validation'
  | 'awaiting_sponsorship'
  | 'funding_required'
  | 'in_progress'
  | 'verification_pending'
  | 'resolved'
  | 'rejected';

export interface PriorityFactors {
  populationImpact: number;
  severity: number;
  deprivation: number;
  coverage: number;
  duration: number;
  recurrence: number;
  repeatedDemand: number;
}

export interface PriorityAdjustment {
  label: string;
  points: number;
  reason: string;
}

export interface AiIntelligence {
  category: ProblemCategory;
  categoryConfidence: number;
  severity: Severity;
  durationDays: number;
  affected: number;
  similarReports: number;
  clusterLabel: string;
  originalQuote: string;
  originalLanguage: string;
  interpretation: { label: string; value: string }[];
  routedDepartmentId: string;
  routingReason: string;
  routingOverridden?: {
    byOfficerId: string;
    departmentId: string;
    reason: string;
    at: string;
  };
}

export interface SponsorMatch {
  sponsorId: string;
  score: number;
  reasons: string[];
  status: 'matched' | 'invited' | 'interested' | 'proposal' | 'declined' | 'approved';
  respondedAt?: string;
  proposalAmount?: number;
  note?: string;
}

export interface Sponsorship {
  status:
    'not_eligible' | 'awaiting' | 'invited' | 'interested' | 'proposal' | 'approved' | 'declined';
  eligible: boolean;
  matches: SponsorMatch[];
  invitedAt?: string;
  responseDueAt?: string;
  approvedSponsorId?: string;
  approvedAmount?: number;
  failureReason?: string;
}

export interface Funding {
  status: 'not_required' | 'pending' | 'recommended' | 'approved' | 'rejected';
  required: number;
  source?: string;
  departmentBudgetAvailable: number;
  fundable: boolean;
  approvedAt?: string;
  approvedBy?: string;
  note?: string;
}

export interface ProjectMilestone {
  label: string;
  done: boolean;
  at?: string;
}

export interface Project {
  id: string;
  contractor: string;
  officerId: string;
  phase: 'planning' | 'implementation' | 'testing' | 'completed';
  progress: number;
  budget: number;
  spent: number;
  startedAt: string;
  dueAt: string;
  dayOfPlan: number;
  planDays: number;
  milestones: ProjectMilestone[];
}

export interface EvidenceSide {
  photos: number;
  activeReports: number;
  note: string;
}

export interface Evidence {
  before: EvidenceSide;
  after?: EvidenceSide;
}

export interface Verification {
  requestedAt?: string;
  asked: number;
  confirmed: number;
  denied: number;
  pending: number;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: 'AI' | 'System' | 'Officer' | 'Citizen' | 'Industry';
  actorName?: string;
  action: string;
  detail?: string;
  automated: boolean;
}

export interface ProblemDto {
  id: string;
  title: string;
  category: ProblemCategory;
  status: ProblemStatus;
  severity: Severity;
  stage: Stage;
  jurisdictionId: string;
  villageIds: string[];
  reportCount: number;
  duplicateCount: number;
  affected: number;
  createdAt: string;
  updatedAt: string;
  slaDueAt: string;
  factors: PriorityFactors;
  adjustments: PriorityAdjustment[];
  estimatedCost: number;
  departmentId: string;
  assignedOfficerId?: string;
  ai: AiIntelligence;
  sponsorship: Sponsorship;
  funding: Funding;
  project?: Project;
  evidence: Evidence;
  verification: Verification;
  audit: AuditEntry[];
}

export interface RankedProblemDto extends ProblemDto {
  score: number;
  rank: number;
  previousRank?: number;
}
