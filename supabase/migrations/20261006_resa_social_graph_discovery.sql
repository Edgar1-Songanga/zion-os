-- RESA social graph visibility and discovery
-- Followers/following are part of the social graph and are readable by authenticated members.
-- Mutations remain owner-scoped by the existing insert/delete policies.

drop policy if exists resa_follows_owner_read on public.resa_follows;
drop policy if exists resa_follows_authenticated_read on public.resa_follows;

create policy resa_follows_authenticated_read
on public.resa_follows
for select
to authenticated
using (true);

create index if not exists resa_follows_follower_created_idx
on public.resa_follows(follower_id, created_at desc);
