-- Persistent/resumable sandbox metadata for branded preview routing.
ALTER TABLE "GenerationSession"
ADD COLUMN "rawSandboxUrl" TEXT,
ADD COLUMN "sandboxName" TEXT,
ADD COLUMN "sandboxRuntimeStatus" TEXT,
ADD COLUMN "currentSnapshotId" TEXT;

-- Sessions now represent durable/resumable workspaces, not only a single
-- running VM session. Keep new records around long enough for persistent
-- Vercel sandbox snapshots to be useful.
ALTER TABLE "GenerationSession"
ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '10 years';

CREATE UNIQUE INDEX "GenerationSession_sandboxName_key" ON "GenerationSession"("sandboxName");
CREATE INDEX "GenerationSession_siteId_lastActiveAt_idx" ON "GenerationSession"("siteId", "lastActiveAt");
