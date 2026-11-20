-- DropForeignKey
ALTER TABLE "Revision" DROP CONSTRAINT "Revision_logId_fkey";

-- AlterTable
ALTER TABLE "Revision" ALTER COLUMN "version" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Revision_logId_version_key" ON "Revision"("logId", "version");

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_logId_fkey" FOREIGN KEY ("logId") REFERENCES "Log"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

