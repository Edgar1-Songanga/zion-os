begin;

create table if not exists public.resa_user_mutes (
  muter_id uuid not null references auth.users(id) on delete cascade,
  muted_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  constraint resa_user_mutes_no_self_mute check (muter_id <> muted_id)
);
create index if not exists resa_user_mutes_muted_idx
  on public.resa_user_mutes(muted_id, muter_id);

alter table public.resa_user_mutes enable row level security;
grant select, insert, delete on public.resa_user_mutes to authenticated;

drop policy if exists resa_user_mutes_read_self on public.resa_user_mutes;
create policy resa_user_mutes_read_self
on public.resa_user_mutes for select to authenticated
using (muter_id = (select auth.uid()));

drop policy if exists resa_user_mutes_insert_self on public.resa_user_mutes;
create policy resa_user_mutes_insert_self
on public.resa_user_mutes for insert to authenticated
with check (muter_id = (select auth.uid()) and muter_id <> muted_id);

drop policy if exists resa_user_mutes_delete_self on public.resa_user_mutes;
create policy resa_user_mutes_delete_self
on public.resa_user_mutes for delete to authenticated
using (muter_id = (select auth.uid()));

-- Suppress future RESA interaction notifications from accounts muted by the recipient.
-- Existing notifications are also filtered by the API when read.
create or replace function private.resa_suppress_muted_notifications()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_actor_id uuid;
begin
  if new.type not like 'resa.%' then
    return new;
  end if;

  if coalesce(new.data->>'actor_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return new;
  end if;

  v_actor_id := (new.data->>'actor_id')::uuid;
  if exists (
    select 1 from public.resa_user_mutes m
    where m.muter_id = new.user_id and m.muted_id = v_actor_id
  ) then
    return null;
  end if;
  return new;
end;
$function$;

revoke all on function private.resa_suppress_muted_notifications() from public, anon, authenticated;
drop trigger if exists resa_suppress_muted_notifications on public.notifications;
create trigger resa_suppress_muted_notifications
before insert on public.notifications
for each row execute function private.resa_suppress_muted_notifications();

commit;
