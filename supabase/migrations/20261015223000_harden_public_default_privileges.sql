-- Harden default privileges for future application objects in public.
-- Existing objects are handled by dedicated, reviewed migrations; this migration
-- intentionally does not blanket-revoke privileges from the current 92 tables.
--
-- Objects created by the migration role must opt in explicitly to public access.
-- Authenticated clients retain normal DML grants, subject to RLS, but do not
-- receive TRUNCATE/REFERENCES/TRIGGER by default.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;

-- Anonymous clients should not inherit EXECUTE on newly created functions.
-- Grant EXECUTE to authenticated/service_role explicitly where required.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;
