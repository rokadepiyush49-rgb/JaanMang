-- CreateEnum
CREATE TYPE "SolutionProposalStatus" AS ENUM ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "HackathonStatus" AS ENUM ('draft', 'announced', 'registration_open', 'in_progress', 'judging', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "CsrDocumentationStatus" AS ENUM ('not_started', 'drafted', 'submitted', 'certified', 'filed');

-- CreateEnum
CREATE TYPE "BadgeTier" AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- CreateEnum
CREATE TYPE "AwardSubject" AS ENUM ('user', 'organization', 'team');

-- CreateEnum
CREATE TYPE "LeaderboardScope" AS ENUM ('citizens', 'students', 'institutes', 'partners', 'officers');

-- CreateEnum
CREATE TYPE "LeaderboardSubject" AS ENUM ('user', 'organization', 'team');

-- AlterTable
ALTER TABLE "problems" ADD COLUMN     "sdgGoals" INTEGER[],
ADD COLUMN     "voteCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "sdgGoals" INTEGER[];

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "lastRecommendedAt" TIMESTAMP(3),
ADD COLUMN     "preferredCategories" "ProblemCategory"[],
ADD COLUMN     "preferredDistricts" TEXT[],
ADD COLUMN     "sdgInterests" INTEGER[],
ADD COLUMN     "verifiedContributions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weeklyHours" INTEGER;

-- CreateTable
CREATE TABLE "problem_votes" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solution_proposals" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "estimatedCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "durationDays" INTEGER,
    "needs" TEXT[],
    "status" "SolutionProposalStatus" NOT NULL DEFAULT 'draft',
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "solution_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hackathons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "about" TEXT,
    "hostOrgId" TEXT,
    "status" "HackathonStatus" NOT NULL DEFAULT 'draft',
    "mode" TEXT,
    "registrationOpensAt" TIMESTAMP(3),
    "registrationClosesAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "prizePool" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "maxTeamSize" INTEGER,
    "venue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "hackathons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hackathon_problems" (
    "hackathonId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "track" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hackathon_problems_pkey" PRIMARY KEY ("hackathonId","problemId")
);

-- CreateTable
CREATE TABLE "hackathon_teams" (
    "hackathonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),
    "finalRank" INTEGER,
    "score" DOUBLE PRECISION,

    CONSTRAINT "hackathon_teams_pkey" PRIMARY KEY ("hackathonId","teamId")
);

-- CreateTable
CREATE TABLE "csr_benefits" (
    "problemId" TEXT NOT NULL,
    "qualifyingSection" TEXT NOT NULL DEFAULT '135',
    "scheduleViiItem" TEXT,
    "financialYear" TEXT NOT NULL,
    "estimatedRelief" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "csrSpendBefore" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "csrSpendAfter" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "documentation" "CsrDocumentationStatus" NOT NULL DEFAULT 'not_started',
    "certificateNo" TEXT,
    "certifiedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csr_benefits_pkey" PRIMARY KEY ("problemId")
);

-- CreateTable
CREATE TABLE "delivery_ratings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "timeliness" INTEGER,
    "quality" INTEGER,
    "conduct" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "delivery_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tier" "BadgeTier" NOT NULL DEFAULT 'bronze',
    "surface" "Surface" NOT NULL,
    "icon" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "criteria" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges_earned" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_earned_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "citation" TEXT,
    "period" TEXT,
    "subjectType" "AwardSubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "grantedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_entries" (
    "id" TEXT NOT NULL,
    "scope" "LeaderboardScope" NOT NULL,
    "subjectType" "LeaderboardSubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL,
    "previousRank" INTEGER,
    "breakdown" JSONB NOT NULL DEFAULT '{}',
    "jurisdictionId" TEXT,
    "period" TEXT NOT NULL DEFAULT 'all-time',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "problem_votes_problemId_idx" ON "problem_votes"("problemId");

-- CreateIndex
CREATE INDEX "problem_votes_userId_idx" ON "problem_votes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "problem_votes_userId_problemId_key" ON "problem_votes"("userId", "problemId");

-- CreateIndex
CREATE INDEX "solution_proposals_problemId_idx" ON "solution_proposals"("problemId");

-- CreateIndex
CREATE INDEX "solution_proposals_orgId_idx" ON "solution_proposals"("orgId");

-- CreateIndex
CREATE INDEX "solution_proposals_teamId_idx" ON "solution_proposals"("teamId");

-- CreateIndex
CREATE INDEX "solution_proposals_status_idx" ON "solution_proposals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "hackathons_code_key" ON "hackathons"("code");

-- CreateIndex
CREATE INDEX "hackathons_status_idx" ON "hackathons"("status");

-- CreateIndex
CREATE INDEX "hackathons_hostOrgId_idx" ON "hackathons"("hostOrgId");

-- CreateIndex
CREATE INDEX "hackathon_problems_problemId_idx" ON "hackathon_problems"("problemId");

-- CreateIndex
CREATE INDEX "hackathon_teams_teamId_idx" ON "hackathon_teams"("teamId");

-- CreateIndex
CREATE INDEX "csr_benefits_financialYear_idx" ON "csr_benefits"("financialYear");

-- CreateIndex
CREATE INDEX "delivery_ratings_projectId_idx" ON "delivery_ratings"("projectId");

-- CreateIndex
CREATE INDEX "delivery_ratings_userId_idx" ON "delivery_ratings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_ratings_projectId_userId_key" ON "delivery_ratings"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_key_key" ON "badges"("key");

-- CreateIndex
CREATE INDEX "badges_surface_idx" ON "badges"("surface");

-- CreateIndex
CREATE INDEX "badges_earned_userId_idx" ON "badges_earned"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "badges_earned_badgeId_userId_key" ON "badges_earned"("badgeId", "userId");

-- CreateIndex
CREATE INDEX "awards_subjectType_subjectId_idx" ON "awards"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "awards_key_idx" ON "awards"("key");

-- CreateIndex
CREATE INDEX "leaderboard_entries_scope_period_rank_idx" ON "leaderboard_entries"("scope", "period", "rank");

-- CreateIndex
CREATE INDEX "leaderboard_entries_subjectType_subjectId_idx" ON "leaderboard_entries"("subjectType", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_entries_scope_subjectType_subjectId_period_juri_key" ON "leaderboard_entries"("scope", "subjectType", "subjectId", "period", "jurisdictionId");

-- AddForeignKey
ALTER TABLE "problem_votes" ADD CONSTRAINT "problem_votes_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_votes" ADD CONSTRAINT "problem_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_proposals" ADD CONSTRAINT "solution_proposals_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_proposals" ADD CONSTRAINT "solution_proposals_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solution_proposals" ADD CONSTRAINT "solution_proposals_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "student_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hackathons" ADD CONSTRAINT "hackathons_hostOrgId_fkey" FOREIGN KEY ("hostOrgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hackathon_problems" ADD CONSTRAINT "hackathon_problems_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hackathon_problems" ADD CONSTRAINT "hackathon_problems_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hackathon_teams" ADD CONSTRAINT "hackathon_teams_hackathonId_fkey" FOREIGN KEY ("hackathonId") REFERENCES "hackathons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hackathon_teams" ADD CONSTRAINT "hackathon_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "student_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csr_benefits" ADD CONSTRAINT "csr_benefits_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "sponsorships"("problemId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_ratings" ADD CONSTRAINT "delivery_ratings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_ratings" ADD CONSTRAINT "delivery_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges_earned" ADD CONSTRAINT "badges_earned_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges_earned" ADD CONSTRAINT "badges_earned_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "awards" ADD CONSTRAINT "awards_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Range constraints.
--
-- Prisma has no range type, so these are hand-written and kept in the
-- migration. The service layer validates the same rules for a readable error;
-- these exist so a bug, a script or a psql session cannot write a 7-star
-- rating or an SDG 23 that every consumer then has to defend against.
-- ---------------------------------------------------------------------------

ALTER TABLE "delivery_ratings"
  ADD CONSTRAINT "delivery_ratings_stars_range" CHECK ("stars" BETWEEN 1 AND 5),
  ADD CONSTRAINT "delivery_ratings_timeliness_range" CHECK ("timeliness" IS NULL OR "timeliness" BETWEEN 1 AND 5),
  ADD CONSTRAINT "delivery_ratings_quality_range" CHECK ("quality" IS NULL OR "quality" BETWEEN 1 AND 5),
  ADD CONSTRAINT "delivery_ratings_conduct_range" CHECK ("conduct" IS NULL OR "conduct" BETWEEN 1 AND 5);

-- The UN goals are numbered 1-17 and that list does not change.
ALTER TABLE "problems"
  ADD CONSTRAINT "problems_sdg_goals_range"
  CHECK ("sdgGoals" <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]);

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_sdg_goals_range"
  CHECK ("sdgGoals" <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]);

ALTER TABLE "student_profiles"
  ADD CONSTRAINT "student_profiles_sdg_interests_range"
  CHECK ("sdgInterests" <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]);

ALTER TABLE "industry_profiles"
  ADD CONSTRAINT "industry_profiles_sdg_preferences_range"
  CHECK ("sdgPreferences" <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]);

-- A rank is 1-based; a 0th place is a bug in the cron, not a tie-break.
ALTER TABLE "leaderboard_entries"
  ADD CONSTRAINT "leaderboard_entries_rank_positive" CHECK ("rank" >= 1),
  ADD CONSTRAINT "leaderboard_entries_previous_rank_positive" CHECK ("previousRank" IS NULL OR "previousRank" >= 1);

-- A hackathon that ends before it starts is not a window.
ALTER TABLE "hackathons"
  ADD CONSTRAINT "hackathons_window_ordered" CHECK ("endsAt" >= "startsAt");
