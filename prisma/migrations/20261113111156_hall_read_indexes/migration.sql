-- CreateIndex
CREATE INDEX "Log_isPublished_beforeDate_idx" ON "Log"("isPublished", "beforeDate");

-- CreateIndex
CREATE INDEX "Log_tags_idx" ON "Log" USING GIN ("tags");
