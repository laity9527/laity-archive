-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "seriesId" TEXT,
ADD COLUMN     "seriesOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Series_userId_idx" ON "Series"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Series_userId_slug_key" ON "Series"("userId", "slug");

-- CreateIndex
CREATE INDEX "Log_seriesId_idx" ON "Log"("seriesId");

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
