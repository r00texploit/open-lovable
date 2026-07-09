-- Encrypted vault for user-supplied AI provider API keys.
CREATE TABLE "AiCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "last4" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "proxyToken" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiCredential_proxyToken_key" ON "AiCredential"("proxyToken");
CREATE UNIQUE INDEX "AiCredential_userId_provider_siteId_key" ON "AiCredential"("userId", "provider", "siteId");
CREATE INDEX "AiCredential_userId_idx" ON "AiCredential"("userId");
CREATE INDEX "AiCredential_siteId_idx" ON "AiCredential"("siteId");

ALTER TABLE "AiCredential" ADD CONSTRAINT "AiCredential_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiCredential" ADD CONSTRAINT "AiCredential_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
