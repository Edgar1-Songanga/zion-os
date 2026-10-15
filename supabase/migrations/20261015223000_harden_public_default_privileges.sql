-- Harden default privileges for future application objects in public.
-- Existing objects are handled by dedicated, reviewed migrations; this migration
-- intentionally does not blanket-revoke privileges from existing application tables.
--
-- This migration hardens objects created by postgres, the role used for the
-- application's reviewed migrations. Supabase's managed supabase_admin role has
-- separate default ACLs that this database connection is not permitted to alter;
-- do not include FOR ROLE supabase_admin here because it makes the migration fail.
--
-- Tables: anonymous clients receive no privileges by default; authenticated
-- clients retain normal DML grants subject to RLS, but not TRUNCATE/REFERENCES/TRIGGER.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;

-- Anonymous clients should not inherit EXECUTE on newly created public functions.
-- Grant EXECUTE to authenticated/service_role explicitly where required.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- Anonymous clients should not inherit sequence access. Keep authenticated
-- sequence grants unchanged because inserts into serial-backed tables may need them.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon;
