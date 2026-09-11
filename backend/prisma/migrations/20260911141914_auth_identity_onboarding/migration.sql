-- CreateEnum
CREATE TYPE "Surface" AS ENUM ('citizen', 'student', 'gov', 'industry', 'institute', 'admin');

-- CreateEnum
CREATE TYPE "GovBodyType" AS ENUM ('gram_panchayat', 'nagar_panchayat', 'municipal_council', 'municipal_corporation', 'block_office', 'district_office', 'line_department', 'other');

-- CreateEnum
CREATE TYPE "OrgSize" AS ENUM ('startup', 'sme', 'enterprise', 'mnc', 'psu', 'csr_trust', 'other');

-- CreateEnum
CREATE TYPE "OrgLocationKind" AS ENUM ('headquarters', 'branch', 'plant', 'office');

-- CreateEnum
CREATE TYPE "VerificationSubject" AS ENUM ('user', 'organization');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected', 'info_requested');

-- AlterEnum
ALTER TYPE "GovLevel" ADD VALUE 'ulb';

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "surface" "Surface" NOT NULL DEFAULT 'citizen';

-- CreateTable
CREATE TABLE "student_profiles" (
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "institutionName" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "currentYear" INTEGER NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "enrollmentNo" TEXT,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "skills" TEXT[],
    "interests" TEXT[],
    "resumeUrl" TEXT,
    "githubUrl" TEXT,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "government_body_profiles" (
    "orgId" TEXT NOT NULL,
    "bodyType" "GovBodyType" NOT NULL,
    "lgdCode" TEXT,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "block" TEXT,
    "bodyName" TEXT NOT NULL,
    "officeAddress" TEXT,
    "pincode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_body_profiles_pkey" PRIMARY KEY ("orgId")
);

-- CreateTable
CREATE TABLE "industry_profiles" (
    "orgId" TEXT NOT NULL,
    "orgSize" "OrgSize" NOT NULL,
    "sector" TEXT NOT NULL,
    "website" TEXT,
    "yearEstablished" INTEGER,
    "employeeCount" INTEGER,
    "csrThemes" TEXT[],
    "geographies" TEXT[],
    "technologyDomains" TEXT[],
    "capabilities" TEXT[],
    "sdgPreferences" INTEGER[],
    "provenDomains" TEXT[],
    "fundingMin" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fundingMax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "csrFinancialYear" TEXT,
    "csrAllocated" DECIMAL(14,2),
    "csrPreferredCeiling" DECIMAL(14,2),
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_profiles_pkey" PRIMARY KEY ("orgId")
);

-- CreateTable
CREATE TABLE "institution_profiles" (
    "orgId" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "accreditation" TEXT,
    "aisheCode" TEXT,
    "focusAreas" TEXT[],
    "labs" TEXT[],
    "emailDomains" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_profiles_pkey" PRIMARY KEY ("orgId")
);

-- CreateTable
CREATE TABLE "org_locations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "kind" "OrgLocationKind" NOT NULL DEFAULT 'branch',
    "label" TEXT,
    "addressLine" TEXT,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "pincode" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "officialEmail" TEXT,
    "officialPhone" TEXT,
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_verifications" (
    "id" TEXT NOT NULL,
    "subjectType" "VerificationSubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "requestedRoleKey" TEXT,
    "jurisdictionId" TEXT,
    "submittedById" TEXT,
    "signals" JSONB NOT NULL DEFAULT '{}',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_year_stats" (
    "year" INTEGER NOT NULL,
    "reportsSubmitted" INTEGER NOT NULL,
    "problemsValidated" INTEGER NOT NULL,
    "problemsResolved" INTEGER NOT NULL,
    "citizensVerifying" INTEGER NOT NULL,
    "villagesCovered" INTEGER NOT NULL,
    "panchayatsOnboard" INTEGER NOT NULL,
    "studentsEngaged" INTEGER NOT NULL,
    "partnerOrgs" INTEGER NOT NULL,
    "fundsRouted" DECIMAL(16,2) NOT NULL,
    "provenance" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_year_stats_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE INDEX "student_profiles_orgId_idx" ON "student_profiles"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "government_body_profiles_lgdCode_key" ON "government_body_profiles"("lgdCode");

-- CreateIndex
CREATE INDEX "government_body_profiles_state_district_idx" ON "government_body_profiles"("state", "district");

-- CreateIndex
CREATE INDEX "org_locations_orgId_idx" ON "org_locations"("orgId");

-- CreateIndex
CREATE INDEX "org_memberships_orgId_idx" ON "org_memberships"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "org_memberships_userId_orgId_key" ON "org_memberships"("userId", "orgId");

-- CreateIndex
CREATE INDEX "account_verifications_status_idx" ON "account_verifications"("status");

-- CreateIndex
CREATE INDEX "account_verifications_subjectType_subjectId_idx" ON "account_verifications"("subjectType", "subjectId");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_body_profiles" ADD CONSTRAINT "government_body_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "industry_profiles" ADD CONSTRAINT "industry_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "institution_profiles" ADD CONSTRAINT "institution_profiles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_locations" ADD CONSTRAINT "org_locations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_verifications" ADD CONSTRAINT "account_verifications_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_verifications" ADD CONSTRAINT "account_verifications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
