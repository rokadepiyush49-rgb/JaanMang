-- CreateTable
CREATE TABLE "challenge_profiles" (
    "problemId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "technologies" TEXT[],
    "capabilitiesNeeded" TEXT[],
    "supportNeeded" TEXT[],
    "timelineDays" INTEGER NOT NULL DEFAULT 120,
    "sanctionReference" TEXT,
    "expectedOutcomes" JSONB NOT NULL DEFAULT '[]',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_profiles_pkey" PRIMARY KEY ("problemId")
);

-- CreateIndex
CREATE INDEX "challenge_profiles_domain_idx" ON "challenge_profiles"("domain");

-- AddForeignKey
ALTER TABLE "challenge_profiles" ADD CONSTRAINT "challenge_profiles_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
