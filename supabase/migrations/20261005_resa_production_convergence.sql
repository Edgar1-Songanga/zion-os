-- RESA production convergence: messaging RLS, profile discovery, notifications and live media.
-- Mirrors the production migration applied to Supabase.

create or replace function private.resa_is_conversation_owner(p_conversation_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.resa_conversation_members m where m.conversation_id = p_conversation_id and m.user_id = p_user_id and m.role = 'owner');
$$;

revoke all on function private.resa_is_conversation_owner(uuid, uuid) from public;
grant execute on function private.resa_is_conversation_owner(uuid, uuid) to authenticated;

drop policy if exists resa_conversation_members_self on public.resa_conversation_members;
create policy resa_conversation_members_self on public.resa_conversation_members for select to authenticated using (
  user_id = (select auth.uid()) or private.resa_is_conversation_owner(conversation_id, (select auth.uid()))
);
drop policy if exists resa_conversation_members_insert on public.resa_conversation_members;
create policy resa_conversation_members_insert on public.resa_conversation_members for insert to authenticated with check (
  user_id = (select auth.uid()) or private.resa_is_conversation_owner(conversation_id, (select auth.uid()))
);
drop policy if exists resa_conversation_members_update on public.resa_conversation_members;
create policy resa_conversation_members_update on public.resa_conversation_members for update to authenticated using (
  user_id = (select auth.uid()) or private.resa_is_conversation_owner(conversation_id, (select auth.uid()))
) with check (
  user_id = (select auth.uid()) or private.resa_is_conversation_owner(conversation_id, (select auth.uid()))
);
drop policy if exists resa_conversation_members_delete on public.resa_conversation_members;
create policy resa_conversation_members_delete on public.resa_conversation_members for delete to authenticated using (
  user_id = (select auth.uid()) or private.resa_is_conversation_owner(conversation_id, (select auth.uid()))
);

create or replace function public.resa_search_profiles(p_query text, p_limit integer default 20)
returns table (id uuid, display_name text, first_name text, last_name text, avatar_url text, email text)
language sql stable security definer set search_path = public, auth as $$
  select u.id,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), split_part(u.email, '@', 1)),
    p.first_name, p.last_name, p.avatar_url, u.email
  from auth.users u left join public.profiles p on p.id = u.id
  where (select auth.uid()) is not null and (
    lower(coalesce(p.display_name, '')) like '%' || lower(trim(p_query)) || '%'
    or lower(coalesce(p.first_name, '')) like '%' || lower(trim(p_query)) || '%'
    or lower(coalesce(p.last_name, '')) like '%' || lower(trim(p_query)) || '%'
    or lower(coalesce(u.email, '')) like '%' || lower(trim(p_query)) || '%'
    or lower(u.id::text) like '%' || lower(trim(p_query)) || '%'
  )
  order by case when lower(coalesce(u.email, '')) = lower(trim(p_query)) then 0 else 1 end, 2 asc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
revoke all on function public.resa_search_profiles(text, integer) from public;
grant execute on function public.resa_search_profiles(text, integer) to authenticated;

create or replace function public.resa_ensure_profile()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  computed_name text := coalesce(nullif(trim(metadata->>'display_name'), ''), nullif(trim(metadata->>'full_name'), ''), nullif(trim(metadata->>'name'), ''), nullif(trim(concat_ws(' ', metadata->>'first_name', metadata->>'last_name')), ''), split_part(new.email, '@', 1), 'Membro RESA');
begin
  insert into public.profiles (id, display_name, first_name, last_name, avatar_url)
  values (new.id, computed_name, nullif(trim(metadata->>'first_name'), ''), nullif(trim(metadata->>'last_name'), ''), nullif(trim(metadata->>'avatar_url'), ''))
  on conflict (id) do update set
    display_name = coalesce(nullif(public.profiles.display_name, ''), excluded.display_name),
    first_name = coalesce(public.profiles.first_name, excluded.first_name),
    last_name = coalesce(public.profiles.last_name, excluded.last_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_resa_ensure_profile on auth.users;
create trigger trg_resa_ensure_profile after insert on auth.users for each row execute function public.resa_ensure_profile();

insert into public.profiles (id, display_name)
select u.id, coalesce(nullif(trim(u.raw_user_meta_data->>'display_name'), ''), nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(u.email, '@', 1), 'Membro RESA')
from auth.users u left join public.profiles p on p.id = u.id where p.id is null;

create or replace function public.resa_message_core_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, type, title, body, channel, priority, data)
  select m.user_id, 'resa.message', 'Nova mensagem', left(new.body, 240), 'in_app', 'normal',
    jsonb_build_object('actor_id', new.sender_id, 'conversation_id', new.conversation_id, 'message_id', new.id)
  from public.resa_conversation_members m
  where m.conversation_id = new.conversation_id and m.user_id <> new.sender_id;
  return new;
end;
$$;
drop trigger if exists trg_resa_message_core_notification on public.resa_messages;
create trigger trg_resa_message_core_notification after insert on public.resa_messages for each row execute function public.resa_message_core_notification();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='resa_live_sessions') then
    alter publication supabase_realtime add table public.resa_live_sessions;
  end if;
end $$;
