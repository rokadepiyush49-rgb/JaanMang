-- AlterTable
ALTER TABLE "citizen_reports" ADD COLUMN     "aiCategory" "ProblemCategory",
ADD COLUMN     "aiKeywords" TEXT[],
ADD COLUMN     "aiSeverity" "Severity",
ADD COLUMN     "aiSource" TEXT,
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "aiTitle" TEXT;
