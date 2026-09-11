-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('citizen', 'staff', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'pending');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'hi');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('login', 'phone_verify', 'password_reset');

-- CreateEnum
CREATE TYPE "GovLevel" AS ENUM ('state', 'district', 'block', 'panchayat');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('institution', 'government_body', 'industry', 'department');

-- CreateEnum
CREATE TYPE "ProblemCategory" AS ENUM ('water', 'roads', 'drainage', 'streetlight', 'waste', 'bridge', 'sanitation', 'school', 'health');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('reported', 'ai_processed', 'validated', 'prioritised', 'sponsorship', 'funded', 'assigned', 'implementation', 'verification', 'impact');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('pending_validation', 'awaiting_sponsorship', 'funding_required', 'in_progress', 'verification_pending', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "ReportChannel" AS ENUM ('voice', 'text', 'photo', 'ivr', 'field');

-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('not_eligible', 'awaiting', 'invited', 'interested', 'proposal', 'approved', 'declined');

-- CreateEnum
CREATE TYPE "SponsorMatchStatus" AS ENUM ('matched', 'invited', 'interested', 'proposal', 'declined', 'approved');

-- CreateEnum
CREATE TYPE "FundingStatus" AS ENUM ('not_required', 'pending', 'recommended', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('intent', 'proposal_submitted', 'awaiting_government', 'committed', 'disbursing', 'closed');

-- CreateEnum
CREATE TYPE "LedgerStage" AS ENUM ('allocated', 'committed', 'disbursed', 'verified');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('proposed', 'approved', 'released');

-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('gov', 'industry');

-- CreateEnum
CREATE TYPE "ProjectPhase" AS ENUM ('planning', 'implementation', 'testing', 'completed');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('discovery', 'team_formed', 'funded', 'research', 'prototype', 'testing', 'pilot', 'deployment', 'impact');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('complete', 'active', 'pending', 'changes_requested');

-- CreateEnum
CREATE TYPE "ProjectDocumentKind" AS ENUM ('spec', 'report', 'approval', 'data', 'financial');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('draft', 'submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "VerificationKind" AS ENUM ('citizen', 'field');

-- CreateEnum
CREATE TYPE "ObjectionStatus" AS ENUM ('open', 'reviewing', 'upheld', 'dismissed');

-- CreateEnum
CREATE TYPE "AutomationScope" AS ENUM ('gov', 'industry');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('healthy', 'attention', 'paused');

-- CreateEnum
CREATE TYPE "AuditActor" AS ENUM ('AI', 'System', 'Officer', 'Citizen', 'Industry');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "kind" "UserKind" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "photoUrl" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "phoneVerifiedAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "orgId" TEXT,
    "jurisdictionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" TEXT NOT NULL,
    "level" "GovLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "population" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "villages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "population" INTEGER NOT NULL,
    "deprivation" DOUBLE PRECISION NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "villages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "sector" TEXT,
    "about" TEXT,
    "jurisdictionId" TEXT,
    "parentOrgId" TEXT,
    "profile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "categories" "ProblemCategory"[],
    "headOfficerId" TEXT,
    "budgetAllocated" DECIMAL(14,2) NOT NULL,
    "budgetCommitted" DECIMAL(14,2) NOT NULL,
    "budgetSpent" DECIMAL(14,2) NOT NULL,
    "slaHours" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "officers" (
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "activeTasks" INTEGER NOT NULL DEFAULT 0,
    "criticalTasks" INTEGER NOT NULL DEFAULT 0,
    "overdue" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResolutionDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "officers_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "sponsors" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "csrThemes" TEXT[],
    "csrGeographies" TEXT[],
    "csrBudgetRemaining" DECIMAL(14,2) NOT NULL,
    "responseRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citizen_reports" (
    "id" TEXT NOT NULL,
    "problemId" TEXT,
    "reporterId" TEXT,
    "citizenName" TEXT NOT NULL,
    "channel" "ReportChannel" NOT NULL,
    "raw" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "photos" INTEGER NOT NULL DEFAULT 0,
    "duplicateOfId" TEXT,
    "aiConfidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "citizen_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ProblemCategory" NOT NULL,
    "status" "ProblemStatus" NOT NULL DEFAULT 'pending_validation',
    "severity" "Severity" NOT NULL DEFAULT 'medium',
    "stage" "Stage" NOT NULL DEFAULT 'ai_processed',
    "jurisdictionId" TEXT NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "affected" INTEGER NOT NULL DEFAULT 0,
    "slaDueAt" TIMESTAMP(3),
    "estimatedCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "departmentId" TEXT,
    "assignedOfficerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_villages" (
    "problemId" TEXT NOT NULL,
    "villageId" TEXT NOT NULL,

    CONSTRAINT "problem_villages_pkey" PRIMARY KEY ("problemId","villageId")
);

-- CreateTable
CREATE TABLE "problem_ai" (
    "problemId" TEXT NOT NULL,
    "category" "ProblemCategory" NOT NULL,
    "categoryConfidence" DOUBLE PRECISION NOT NULL,
    "severity" "Severity" NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "affected" INTEGER NOT NULL,
    "similarReports" INTEGER NOT NULL,
    "clusterLabel" TEXT NOT NULL,
    "originalQuote" TEXT NOT NULL,
    "originalLanguage" TEXT NOT NULL,
    "interpretation" JSONB NOT NULL,
    "routedDepartmentId" TEXT,
    "routingReason" TEXT NOT NULL,
    "routingOverridden" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_ai_pkey" PRIMARY KEY ("problemId")
);

-- CreateTable
CREATE TABLE "problem_factors" (
    "problemId" TEXT NOT NULL,
    "populationImpact" DOUBLE PRECISION NOT NULL,
    "severity" DOUBLE PRECISION NOT NULL,
    "deprivation" DOUBLE PRECISION NOT NULL,
    "coverage" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "recurrence" DOUBLE PRECISION NOT NULL,
    "repeatedDemand" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "problem_factors_pkey" PRIMARY KEY ("problemId")
);

-- CreateTable
CREATE TABLE "priority_adjustments" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "priority_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priority_weight_sets" (
    "id" TEXT NOT NULL,
    "jurisdictionId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "weights" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "priority_weight_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clusters" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ProblemCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "mergedDuplicates" INTEGER NOT NULL DEFAULT 0,
    "affected" INTEGER NOT NULL DEFAULT 0,
    "centroidLat" DOUBLE PRECISION NOT NULL,
    "centroidLng" DOUBLE PRECISION NOT NULL,
    "radiusM" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER,
    "totalRanked" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cluster_problems" (
    "clusterId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,

    CONSTRAINT "cluster_problems_pkey" PRIMARY KEY ("clusterId","problemId")
);

-- CreateTable
CREATE TABLE "sponsorships" (
    "problemId" TEXT NOT NULL,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'not_eligible',
    "eligible" BOOLEAN NOT NULL DEFAULT false,
    "invitedAt" TIMESTAMP(3),
    "responseDueAt" TIMESTAMP(3),
    "approvedSponsorId" TEXT,
    "approvedAmount" DECIMAL(14,2),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorships_pkey" PRIMARY KEY ("problemId")
);

-- CreateTable
CREATE TABLE "sponsorship_matches" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasons" TEXT[],
    "status" "SponsorMatchStatus" NOT NULL DEFAULT 'matched',
    "respondedAt" TIMESTAMP(3),
    "proposalAmount" DECIMAL(14,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsorship_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding" (
    "problemId" TEXT NOT NULL,
    "status" "FundingStatus" NOT NULL DEFAULT 'not_required',
    "required" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "source" TEXT,
    "departmentBudgetAvailable" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fundable" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funding_pkey" PRIMARY KEY ("problemId")
);

-- CreateTable
CREATE TABLE "funding_commitments" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "sponsorOrgId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "CommitmentStatus" NOT NULL DEFAULT 'intent',
    "alsoOffering" TEXT[],
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "note" TEXT,
    "tranches" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funding_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "problemId" TEXT,
    "clusterId" TEXT,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "department" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "stage" "LedgerStage" NOT NULL,
    "verifiedByCitizens" BOOLEAN NOT NULL DEFAULT false,
    "at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocations" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT,
    "problemId" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "approvedById" TEXT NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'proposed',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "kind" "ProjectKind" NOT NULL,
    "problemId" TEXT,
    "title" TEXT NOT NULL,
    "phase" "ProjectPhase" NOT NULL DEFAULT 'planning',
    "stage" "ProjectStage",
    "progress" INTEGER NOT NULL DEFAULT 0,
    "budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "spent" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "contractor" TEXT,
    "officerId" TEXT,
    "universityId" TEXT,
    "teamId" TEXT,
    "governmentBody" TEXT,
    "startedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "planDays" INTEGER,
    "dayOfPlan" INTEGER,
    "govMilestones" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "detail" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'pending',
    "percent" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliverables" TEXT[],
    "awaitingReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "trancheAmount" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilots" (
    "projectId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "villages" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "dayOfPlan" INTEGER NOT NULL,
    "users" INTEGER NOT NULL,
    "adoption" DOUBLE PRECISION NOT NULL,
    "reliability" DOUBLE PRECISION NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '[]',
    "issues" JSONB NOT NULL DEFAULT '[]',
    "feedback" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilots_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "project_documents" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProjectDocumentKind" NOT NULL,
    "sizeKb" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "sharedWith" TEXT[],
    "at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty" (
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "expertise" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "student_teams" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "facultyId" TEXT,
    "name" TEXT NOT NULL,
    "skills" TEXT[],
    "stage" "ProjectStage" NOT NULL DEFAULT 'discovery',
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "mentorRolesWanted" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teamId" TEXT,
    "challengeId" TEXT,
    "opportunityRef" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'draft',
    "note" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship_requests" (
    "id" TEXT NOT NULL,
    "problemId" TEXT,
    "projectId" TEXT,
    "teamId" TEXT NOT NULL,
    "roles" TEXT[],
    "hoursPerMonth" INTEGER NOT NULL,
    "stage" "ProjectStage" NOT NULL,
    "need" TEXT NOT NULL,
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentorship_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_assignments" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "mentorUserId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roles" TEXT[],
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_sessions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thread_participants" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "thread_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "kind" "VerificationKind" NOT NULL,
    "fixed" BOOLEAN NOT NULL,
    "checklist" JSONB,
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requests" (
    "problemId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3),
    "asked" INTEGER NOT NULL DEFAULT 0,
    "confirmed" INTEGER NOT NULL DEFAULT 0,
    "denied" INTEGER NOT NULL DEFAULT 0,
    "pending" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_requests_pkey" PRIMARY KEY ("problemId")
);

-- CreateTable
CREATE TABLE "ranking_objections" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ObjectionStatus" NOT NULL DEFAULT 'open',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranking_objections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "problemId" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("problemId")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impact_points_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impact_points_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "r2Key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionLabel" TEXT,
    "actionHref" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "scope" "AutomationScope" NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "status" "AutomationStatus" NOT NULL DEFAULT 'healthy',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextAction" TEXT,
    "affectedRecords" INTEGER NOT NULL DEFAULT 0,
    "runsToday" INTEGER NOT NULL DEFAULT 0,
    "requiresHuman" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "problemId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" "AuditActor" NOT NULL,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "automated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_trend_points" (
    "id" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "reported" INTEGER NOT NULL,
    "resolved" INTEGER NOT NULL,
    "priorityAvg" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_trend_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_kind_idx" ON "users"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "otp_codes_phone_purpose_idx" ON "otp_codes"("phone", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_orgId_jurisdictionId_key" ON "user_roles"("userId", "roleId", "orgId", "jurisdictionId");

-- CreateIndex
CREATE INDEX "jurisdictions_parentId_idx" ON "jurisdictions"("parentId");

-- CreateIndex
CREATE INDEX "villages_jurisdictionId_idx" ON "villages"("jurisdictionId");

-- CreateIndex
CREATE INDEX "organizations_type_idx" ON "organizations"("type");

-- CreateIndex
CREATE UNIQUE INDEX "departments_orgId_key" ON "departments"("orgId");

-- CreateIndex
CREATE INDEX "officers_departmentId_idx" ON "officers"("departmentId");

-- CreateIndex
CREATE INDEX "officers_jurisdictionId_idx" ON "officers"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "sponsors_orgId_key" ON "sponsors"("orgId");

-- CreateIndex
CREATE INDEX "citizen_reports_problemId_idx" ON "citizen_reports"("problemId");

-- CreateIndex
CREATE INDEX "citizen_reports_villageId_idx" ON "citizen_reports"("villageId");

-- CreateIndex
CREATE INDEX "problems_status_idx" ON "problems"("status");

-- CreateIndex
CREATE INDEX "problems_jurisdictionId_idx" ON "problems"("jurisdictionId");

-- CreateIndex
CREATE INDEX "problems_category_idx" ON "problems"("category");

-- CreateIndex
CREATE INDEX "problems_departmentId_idx" ON "problems"("departmentId");

-- CreateIndex
CREATE INDEX "priority_adjustments_problemId_idx" ON "priority_adjustments"("problemId");

-- CreateIndex
CREATE INDEX "priority_weight_sets_jurisdictionId_published_idx" ON "priority_weight_sets"("jurisdictionId", "published");

-- CreateIndex
CREATE UNIQUE INDEX "clusters_code_key" ON "clusters"("code");

-- CreateIndex
CREATE INDEX "sponsorship_matches_problemId_idx" ON "sponsorship_matches"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "sponsorship_matches_problemId_sponsorId_key" ON "sponsorship_matches"("problemId", "sponsorId");

-- CreateIndex
CREATE INDEX "funding_commitments_problemId_idx" ON "funding_commitments"("problemId");

-- CreateIndex
CREATE INDEX "ledger_entries_fiscalYear_idx" ON "ledger_entries"("fiscalYear");

-- CreateIndex
CREATE INDEX "projects_problemId_idx" ON "projects"("problemId");

-- CreateIndex
CREATE INDEX "milestones_projectId_idx" ON "milestones"("projectId");

-- CreateIndex
CREATE INDEX "project_documents_projectId_idx" ON "project_documents"("projectId");

-- CreateIndex
CREATE INDEX "student_teams_orgId_idx" ON "student_teams"("orgId");

-- CreateIndex
CREATE INDEX "team_members_teamId_idx" ON "team_members"("teamId");

-- CreateIndex
CREATE INDEX "applications_studentId_idx" ON "applications"("studentId");

-- CreateIndex
CREATE INDEX "mentor_sessions_assignmentId_idx" ON "mentor_sessions"("assignmentId");

-- CreateIndex
CREATE INDEX "message_threads_projectId_idx" ON "message_threads"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "thread_participants_threadId_userId_key" ON "thread_participants"("threadId", "userId");

-- CreateIndex
CREATE INDEX "messages_threadId_idx" ON "messages"("threadId");

-- CreateIndex
CREATE INDEX "verifications_problemId_idx" ON "verifications"("problemId");

-- CreateIndex
CREATE INDEX "ranking_objections_problemId_idx" ON "ranking_objections"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_userId_key_key" ON "achievements"("userId", "key");

-- CreateIndex
CREATE INDEX "impact_points_ledger_userId_idx" ON "impact_points_ledger"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_r2Key_key" ON "attachments"("r2Key");

-- CreateIndex
CREATE INDEX "attachments_entityType_entityId_idx" ON "attachments"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "automations_scope_idx" ON "automations"("scope");

-- CreateIndex
CREATE INDEX "audit_entries_entityType_entityId_idx" ON "audit_entries"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_entries_problemId_idx" ON "audit_entries"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_trend_points_week_key" ON "weekly_trend_points"("week");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jurisdictions" ADD CONSTRAINT "jurisdictions_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "villages" ADD CONSTRAINT "villages_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_parentOrgId_fkey" FOREIGN KEY ("parentOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "officers" ADD CONSTRAINT "officers_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_reports" ADD CONSTRAINT "citizen_reports_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_reports" ADD CONSTRAINT "citizen_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_reports" ADD CONSTRAINT "citizen_reports_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "villages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citizen_reports" ADD CONSTRAINT "citizen_reports_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "citizen_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_assignedOfficerId_fkey" FOREIGN KEY ("assignedOfficerId") REFERENCES "officers"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_villages" ADD CONSTRAINT "problem_villages_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_villages" ADD CONSTRAINT "problem_villages_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES "villages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_ai" ADD CONSTRAINT "problem_ai_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_factors" ADD CONSTRAINT "problem_factors_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_adjustments" ADD CONSTRAINT "priority_adjustments_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_weight_sets" ADD CONSTRAINT "priority_weight_sets_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "jurisdictions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_weight_sets" ADD CONSTRAINT "priority_weight_sets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cluster_problems" ADD CONSTRAINT "cluster_problems_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cluster_problems" ADD CONSTRAINT "cluster_problems_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_matches" ADD CONSTRAINT "sponsorship_matches_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_matches" ADD CONSTRAINT "sponsorship_matches_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "sponsors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding" ADD CONSTRAINT "funding_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding" ADD CONSTRAINT "funding_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_commitments" ADD CONSTRAINT "funding_commitments_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_commitments" ADD CONSTRAINT "funding_commitments_sponsorOrgId_fkey" FOREIGN KEY ("sponsorOrgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocations" ADD CONSTRAINT "allocations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "student_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilots" ADD CONSTRAINT "pilots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teams" ADD CONSTRAINT "student_teams_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teams" ADD CONSTRAINT "student_teams_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "student_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "student_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_requests" ADD CONSTRAINT "mentorship_requests_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_requests" ADD CONSTRAINT "mentorship_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_requests" ADD CONSTRAINT "mentorship_requests_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "student_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "mentorship_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "student_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_assignments" ADD CONSTRAINT "mentor_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_sessions" ADD CONSTRAINT "mentor_sessions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "mentor_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_participants" ADD CONSTRAINT "thread_participants_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_requests" ADD CONSTRAINT "verification_requests_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_objections" ADD CONSTRAINT "ranking_objections_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_objections" ADD CONSTRAINT "ranking_objections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impact_points_ledger" ADD CONSTRAINT "impact_points_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
