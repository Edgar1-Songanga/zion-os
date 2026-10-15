-- Harden default privileges for future application objects in public.
-- Existing objects are handled by dedicated, reviewed migrations; this migration
-- intentionally does not blanket-revoke privileges from existing application tables.
--
-- Supabase production currently has custom default ACLs for both postgres and
-- supabase_admin. Harden both creators so the result does not depend on which
-- role creates a future object in the exposed public schema.
--
-- Tables: anonymous clients receive no privileges by default; authenticated
-- clients retain normal DML grants subject to RLS, but not TRUNCATE/REFERENCES/TRIGGER.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;

-- Anonymous clients should not inherit EXECUTE on newly created public functions.
-- Grant EXECUTE to authenticated/service_role explicitly where required.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- Anonymous clients should not inherit sequence access. Keep authenticated
-- sequence grants unchanged because inserts into serial-backed tables may need them.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon;
