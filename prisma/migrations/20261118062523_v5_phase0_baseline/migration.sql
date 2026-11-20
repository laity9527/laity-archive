-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('PENDING', 'VERIFIED', 'OVERTURNED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'REPLIED', 'ARCHIVED', 'SPAM');

-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "currentRevId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hashVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "impactMd" TEXT,
ADD COLUMN     "riskMd" TEXT,
ADD COLUMN     "rollbackMd" TEXT,
ADD COLUMN     "scopeMd" TEXT,
ADD COLUMN     "verdict" "Verdict" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verdictNote" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "coverId" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownership" TEXT NOT NULL DEFAULT 'SELF',
ADD COLUMN     "result" TEXT,
ADD COLUMN     "solution" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "year" INTEGER;

-- AlterTable
ALTER TABLE "Revision" ADD COLUMN     "gitSha" TEXT,
ADD COLUMN     "gitSyncedAt" TIMESTAMP(3),
ADD COLUMN     "gitTag" TEXT,
ADD COLUMN     "hashVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "impactMd" TEXT,
ADD COLUMN     "riskMd" TEXT,
ADD COLUMN     "rollbackMd" TEXT,
ADD COLUMN     "scopeMd" TEXT,
ADD COLUMN     "verdictAtPublish" "Verdict" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "version" INTEGER;

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraceTopic" (
    "traceId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "TraceTopic_pkey" PRIMARY KEY ("traceId","topicId")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reqType" TEXT NOT NULL,
    "evidenceReq" TEXT,
    "message" TEXT NOT NULL,
    "ipHash" TEXT,
    "ua" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "replyNote" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "ossKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "variants" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "priceNote" TEXT,
    "deliveryDays" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE INDEX "TraceTopic_topicId_idx" ON "TraceTopic"("topicId");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Media_ossKey_key" ON "Media"("ossKey");

-- CreateIndex
CREATE INDEX "Media_userId_idx" ON "Media"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Log_isPublished_verdict_idx" ON "Log"("isPublished", "verdict");

-- CreateIndex
CREATE INDEX "Project_status_ownership_idx" ON "Project"("status", "ownership");

-- CreateIndex
CREATE INDEX "Revision_contentHash_idx" ON "Revision"("contentHash");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceTopic" ADD CONSTRAINT "TraceTopic_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraceTopic" ADD CONSTRAINT "TraceTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
