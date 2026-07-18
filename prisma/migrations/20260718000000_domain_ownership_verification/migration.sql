-- Custom domains must prove ownership with a per-site DNS TXT challenge before
-- the VPS agent or Caddy will route/issue certificates for them.
ALTER TABLE "Site" ADD COLUMN "domainVerificationToken" TEXT;
ALTER TABLE "GenerationSession" ALTER COLUMN "sandboxProvider" SET DEFAULT 'vps';
UPDATE "Site"
SET "customDomainVerified" = FALSE,
    "domainStatus" = 'pending_verification'
WHERE "customDomain" IS NOT NULL;
