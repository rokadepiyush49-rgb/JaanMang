-- AlterEnum
ALTER TYPE "ReportChannel" ADD VALUE 'web';

-- AlterTable
ALTER TABLE "problem_factors" ADD COLUMN     "citizenVotes" DOUBLE PRECISION NOT NULL DEFAULT 0;
