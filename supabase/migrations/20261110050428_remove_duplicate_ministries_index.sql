begin;

-- The same (id, organization_id) unique key is already enforced by the
-- ministries_id_organization_id_unique constraint. Keep its backing index,
-- which is referenced by composite foreign keys, and remove the redundant
-- standalone index created by an earlier department migration.
drop index if exists public.ministries_id_org_unique;

commit;
