-- DropIndex
DROP INDEX "Service_slug_key";

-- AlterTable
ALTER TABLE "Faq" DROP COLUMN "isPublished",
DROP COLUMN "sortOrder",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sort" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Media" DROP COLUMN "url",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "hash" TEXT,
ADD COLUMN     "isEvidence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalName" TEXT,
ADD COLUMN     "ossUrl" TEXT NOT NULL,
ADD COLUMN     "traceId" TEXT;

-- AlterTable
ALTER TABLE "Revision" ADD COLUMN     "mediaHashes" TEXT;

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "deliveryDays",
DROP COLUMN "desc",
DROP COLUMN "isPublished",
DROP COLUMN "name",
DROP COLUMN "price",
DROP COLUMN "priceNote",
DROP COLUMN "slug",
DROP COLUMN "sortOrder",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sort" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "summary" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Faq_enabled_sort_idx" ON "Faq"("enabled", "sort");

-- CreateIndex
CREATE INDEX "Media_traceId_idx" ON "Media"("traceId");

-- CreateIndex
CREATE INDEX "Media_deletedAt_idx" ON "Media"("deletedAt");

-- CreateIndex
CREATE INDEX "Service_enabled_sort_idx" ON "Service"("enabled", "sort");

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "Log"("id") ON DELETE SET NULL ON UPDATE CASCADE;

