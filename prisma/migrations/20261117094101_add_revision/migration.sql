-- CreateTable
CREATE TABLE "Revision" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "beforeContent" TEXT NOT NULL,
    "afterContent" TEXT,
    "tags" TEXT[],
    "contentHash" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Revision_logId_createdAt_idx" ON "Revision"("logId", "createdAt");

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_logId_fkey" FOREIGN KEY ("logId") REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE;
