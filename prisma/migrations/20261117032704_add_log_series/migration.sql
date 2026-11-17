-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "series" TEXT;

-- CreateIndex
CREATE INDEX "Log_userId_isPublished_series_idx" ON "Log"("userId", "isPublished", "series");
