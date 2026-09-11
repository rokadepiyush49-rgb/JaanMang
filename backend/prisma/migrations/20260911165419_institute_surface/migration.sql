-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('forming', 'active', 'submitted', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('university', 'college', 'polytechnic', 'iti', 'training_institute', 'other');

-- CreateEnum
CREATE TYPE "ProgramLevel" AS ENUM ('certificate', 'diploma', 'undergraduate', 'postgraduate', 'doctoral');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('active', 'paused', 'archived');

-- AlterTable
ALTER TABLE "faculty" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "guideCapacity" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "officialEmail" TEXT,
ADD COLUMN     "officialPhone" TEXT;

-- AlterTable
ALTER TABLE "institution_profiles" ADD COLUMN     "district" TEXT,
ADD COLUMN     "establishedYear" INTEGER,
ADD COLUMN     "institutionType" "InstitutionType" NOT NULL DEFAULT 'college',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "officialEmail" TEXT,
ADD COLUMN     "officialPhone" TEXT,
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "programId" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- AlterTable
ALTER TABLE "student_teams" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "problemId" TEXT,
ADD COLUMN     "status" "TeamStatus" NOT NULL DEFAULT 'forming',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "institute_departments" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "hodFacultyId" TEXT,
    "facultyStrength" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "institute_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "ProgramLevel" NOT NULL,
    "durationYears" INTEGER NOT NULL,
    "intake" INTEGER,
    "eligibility" TEXT,
    "status" "ProgramStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "institute_departments_orgId_idx" ON "institute_departments"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "institute_departments_orgId_code_key" ON "institute_departments"("orgId", "code");

-- CreateIndex
CREATE INDEX "programs_orgId_idx" ON "programs"("orgId");

-- CreateIndex
CREATE INDEX "programs_departmentId_idx" ON "programs"("departmentId");

-- CreateIndex
CREATE INDEX "faculty_orgId_idx" ON "faculty"("orgId");

-- CreateIndex
CREATE INDEX "faculty_departmentId_idx" ON "faculty"("departmentId");

-- CreateIndex
CREATE INDEX "institution_profiles_state_idx" ON "institution_profiles"("state");

-- CreateIndex
CREATE INDEX "student_profiles_departmentId_idx" ON "student_profiles"("departmentId");

-- CreateIndex
CREATE INDEX "student_teams_facultyId_idx" ON "student_teams"("facultyId");

-- CreateIndex
CREATE INDEX "student_teams_departmentId_idx" ON "student_teams"("departmentId");

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "institute_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teams" ADD CONSTRAINT "student_teams_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_teams" ADD CONSTRAINT "student_teams_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "institute_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "institute_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institute_departments" ADD CONSTRAINT "institute_departments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "institute_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
