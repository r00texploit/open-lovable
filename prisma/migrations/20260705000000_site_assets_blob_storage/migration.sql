-- Store published site assets in Vercel Blob; inline bytes become an optional fallback
ALTER TABLE "SiteAsset" ALTER COLUMN "content" DROP NOT NULL;
ALTER TABLE "SiteAsset" ADD COLUMN "blobUrl" TEXT;
