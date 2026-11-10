/*
  Warnings:

  - A unique constraint covering the columns `[userId,sourceCommitSha]` on the table `Log` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "sourceCommitSha" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "githubAccessToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Log_userId_sourceCommitSha_key" ON "Log"("userId", "sourceCommitSha");
