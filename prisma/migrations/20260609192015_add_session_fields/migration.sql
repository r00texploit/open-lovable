-- AlterTable
ALTER TABLE "GenerationSession" ADD COLUMN     "existingFiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
ADD COLUMN     "fileCache" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'creating',
ADD COLUMN     "viteErrors" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "GenerationSession_sandboxId_idx" ON "GenerationSession"("sandboxId");

-- CreateIndex
CREATE INDEX "GenerationSession_expiresAt_idx" ON "GenerationSession"("expiresAt");
