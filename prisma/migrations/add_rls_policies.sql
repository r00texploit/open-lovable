-- Row-Level Security (RLS) Migration for Multi-Tenant Deployment
-- Run this after: prisma migrate dev

-- Enable RLS on all tables that contain tenant data
-- Note: Update table names to match your actual schema

-- Example for a 'Site' table with tenant_id column
-- ALTER TABLE "Site" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;

-- Create a function to set the current tenant ID for RLS
-- CREATE OR REPLACE FUNCTION set_tenant_id(tenant_id UUID)
-- RETURNS VOID AS $$
-- BEGIN
--   PERFORM set_config('app.current_tenant', tenant_id::text, false);
-- END;
-- $$ LANGUAGE plpgsql;

-- Create RLS policies for tenant isolation
-- Example:
-- CREATE POLICY tenant_isolation_select ON "Site"
--   FOR SELECT
--   USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- CREATE POLICY tenant_isolation_insert ON "Site"
--   FOR INSERT
--   WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- CREATE POLICY tenant_isolation_update ON "Site"
--   FOR UPDATE
--   USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- CREATE POLICY tenant_isolation_delete ON "Site"
--   FOR DELETE
--   USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- Force RLS for table owners (important!)
-- ALTER TABLE "Site" FORCE ROW LEVEL SECURITY;

-- Instructions:
-- 1. Uncomment the sections above and update table names
-- 2. Run: psql $DATABASE_URL -f prisma/migrations/add_rls_policies.sql
-- 3. Verify with: SELECT * FROM pg_policies WHERE tablename = 'Site';
