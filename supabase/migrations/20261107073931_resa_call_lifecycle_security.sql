create or replace function private.resa_guard_call_update()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if row(new.id, new.conversation_id, new.initiator_id, new.kind, new.created_at)
     is distinct from
     row(old.id, old.conversation_id, old.initiator_id, old.kind, old.created_at) then
    raise exception 'Call identity fields are immutable' using errcode = '42501';
  end if;

  if old.status = 'ringing' and new.status not in ('ringing', 'active', 'ended', 'missed', 'declined') then
    raise exception 'Invalid call transition from ringing' using errcode = '42501';
  elsif old.status = 'active' and new.status not in ('active', 'ended') then
    raise exception 'Invalid call transition from active' using errcode = '42501';
  elsif old.status in ('ended', 'missed', 'declined') and new.status is distinct from old.status then
    raise exception 'A finished call cannot be reopened' using errcode = '42501';
  end if;

  if old.answered_at is not null and new.answered_at is distinct from old.answered_at then
    raise exception 'Call answer time is immutable once set' using errcode = '42501';
  end if;
  if new.status = 'active' and old.status = 'ringing' and new.answered_at is null then
    raise exception 'An answered call must have answered_at' using errcode = '42501';
  end if;
  if old.ended_at is not null and new.ended_at is distinct from old.ended_at then
    raise exception 'Call end time is immutable once set' using errcode = '42501';
  end if;
  if new.status in ('ended', 'missed', 'declined') and old.status in ('ringing', 'active') and new.ended_at is null then
    raise exception 'A finished call must have ended_at' using errcode = '42501';
  end if;
  return new;
end;
$function$;

create or replace function private.resa_guard_call_participant_identity()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.call_id is distinct from old.call_id or new.user_id is distinct from old.user_id then
    raise exception 'Call participant identity is immutable' using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists resa_calls_guard_update on public.resa_calls;
create trigger resa_calls_guard_update
before update on public.resa_calls
for each row execute function private.resa_guard_call_update();

drop trigger if exists resa_call_participants_guard_identity on public.resa_call_participants;
create trigger resa_call_participants_guard_identity
before update on public.resa_call_participants
for each row execute function private.resa_guard_call_participant_identity();

drop policy if exists resa_calls_member_update on public.resa_calls;
drop policy if exists "resa_calls_member_update" on public.resa_calls;
create policy resa_calls_member_update on public.resa_calls
for update to authenticated
using (
  exists (
    select 1 from public.resa_conversation_members m
    where m.conversation_id = resa_calls.conversation_id
      and m.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.resa_conversation_members m
    where m.conversation_id = resa_calls.conversation_id
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists resa_call_participants_update on public.resa_call_participants;
create policy resa_call_participants_update on public.resa_call_participants
for update to authenticated
using (
  exists (
    select 1 from public.resa_calls c
    join public.resa_conversation_members m on m.conversation_id = c.conversation_id
    where c.id = resa_call_participants.call_id
      and m.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.resa_calls c
    join public.resa_conversation_members m on m.conversation_id = c.conversation_id
    where c.id = resa_call_participants.call_id
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists resa_call_signals_insert on public.resa_call_signals;
create policy resa_call_signals_insert on public.resa_call_signals
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and recipient_id <> sender_id
  and exists (
    select 1
    from public.resa_calls c
    where c.id = resa_call_signals.call_id
      and c.status in ('ringing', 'active')
      and exists (
        select 1 from public.resa_conversation_members m
        where m.conversation_id = c.conversation_id
          and m.user_id = (select auth.uid())
      )
      and exists (
        select 1 from public.resa_conversation_members m
        where m.conversation_id = c.conversation_id
          and m.user_id = resa_call_signals.recipient_id
      )
  )
);

drop policy if exists resa_call_signals_select on public.resa_call_signals;
create policy resa_call_signals_select on public.resa_call_signals
for select to authenticated
using (
  (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()))
  and exists (
    select 1
    from public.resa_calls c
    join public.resa_conversation_members m on m.conversation_id = c.conversation_id
    where c.id = resa_call_signals.call_id
      and m.user_id = (select auth.uid())
  )
);
