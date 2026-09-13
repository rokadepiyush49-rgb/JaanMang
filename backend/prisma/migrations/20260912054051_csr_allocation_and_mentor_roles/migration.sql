-- AlterTable
ALTER TABLE "industry_profiles" ADD COLUMN     "csrAllocation" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "csrCommittedElsewhere" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "org_memberships" ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "mentorHoursPerMonth" INTEGER,
ADD COLUMN     "mentorRoles" TEXT[];
