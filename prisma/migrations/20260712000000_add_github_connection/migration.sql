-- Encrypted GitHub OAuth token storage per site.
CREATE TABLE "GitHubConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "githubUserId" TEXT,
    "githubLogin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GitHubConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GitHubConnection_siteId_key" ON "GitHubConnection"("siteId");
CREATE INDEX "GitHubConnection_userId_idx" ON "GitHubConnection"("userId");

ALTER TABLE "GitHubConnection" ADD CONSTRAINT "GitHubConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GitHubConnection" ADD CONSTRAINT "GitHubConnection_siteId_fkey"
    FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
