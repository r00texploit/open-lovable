-- CreateTable
CREATE TABLE "GenerationSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT,
    "sandboxId" TEXT NOT NULL,
    "sandboxProvider" TEXT NOT NULL DEFAULT 'vercel',
    "sandboxUrl" TEXT,
    "chatMessages" JSONB NOT NULL DEFAULT '[]',
    "conversationCtx" JSONB,
    "aiModel" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GenerationSession_sandboxId_key" ON "GenerationSession"("sandboxId");

-- CreateIndex
CREATE INDEX "GenerationSession_userId_lastActiveAt_idx" ON "GenerationSession"("userId", "lastActiveAt");

-- AddForeignKey
ALTER TABLE "GenerationSession" ADD CONSTRAINT "GenerationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationSession" ADD CONSTRAINT "GenerationSession_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
