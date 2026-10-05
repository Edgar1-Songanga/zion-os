-- RESA media uploads and conversation membership RLS hardening.
-- Applied to production Supabase project wwdchvadowqakvrxcnkz.

drop policy if exists resa_media_insert_own on storage.objects;
create policy resa_media_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'resa-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists resa_media_update_own on storage.objects;
create policy resa_media_update_own on storage.objects
for update to authenticated
using (bucket_id = 'resa-media' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'resa-media' and owner_id = (select auth.uid())::text);

drop policy if exists resa_media_delete_own on storage.objects;
create policy resa_media_delete_own on storage.objects
for delete to authenticated
using (bucket_id = 'resa-media' and owner_id = (select auth.uid())::text);

drop policy if exists resa_conversation_members_self on public.resa_conversation_members;
create policy resa_conversation_members_self on public.resa_conversation_members
for all to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.resa_conversation_members actor
    where actor.conversation_id = resa_conversation_members.conversation_id
      and actor.user_id = (select auth.uid())
      and actor.role = 'owner'
  )
)
with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.resa_conversation_members actor
    where actor.conversation_id = resa_conversation_members.conversation_id
      and actor.user_id = (select auth.uid())
      and actor.role = 'owner'
  )
);
