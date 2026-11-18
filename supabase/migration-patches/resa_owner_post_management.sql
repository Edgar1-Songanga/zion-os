begin;

alter table public.resa_contents
  add column if not exists edited_at timestamptz;

-- Authors can permanently delete only their own RESA publications.
-- Moderation remains a separate, audited workflow and cannot be bypassed by
-- changing moderation_status through the ordinary owner update path.
drop policy if exists resa_contents_owner_delete on public.resa_contents;
create policy resa_contents_owner_delete
on public.resa_contents
for delete to authenticated
using (author_id = (select auth.uid()));

commit;
