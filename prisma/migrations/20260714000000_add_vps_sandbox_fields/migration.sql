-- Add fields needed to track VPS sandbox containers and host endpoints.
ALTER TABLE "GenerationSession" ADD COLUMN "sandboxContainerId" TEXT;
ALTER TABLE "GenerationSession" ADD COLUMN "sandboxHost" TEXT;
