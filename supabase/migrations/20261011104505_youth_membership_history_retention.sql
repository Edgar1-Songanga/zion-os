-- Preserve progression, investiture, and attendance history when a club membership ends.
-- Normal API removal is a soft deactivation. Hard deletion is restricted to history-free self-leave.

drop policy if exists youth_club_members_self_leave_or_admin_delete on public.youth_club_members;
create policy youth_club_members_self_leave_or_admin_delete on public.youth_club_members
for delete to authenticated
using (
  user_id = (select auth.uid())
  and not exists (
    select 1 from public.youth_member_progress p
    where p.club_id = youth_club_members.club_id and p.user_id = youth_club_members.user_id
  )
  and not exists (
    select 1 from public.youth_investitures i
    where i.club_id = youth_club_members.club_id and i.user_id = youth_club_members.user_id
  )
  and not exists (
    select 1 from public.youth_activity_participants a
    where a.club_id = youth_club_members.club_id and a.user_id = youth_club_members.user_id
  )
);

drop policy if exists youth_club_members_self_deactivate on public.youth_club_members;
create policy youth_club_members_self_deactivate on public.youth_club_members
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and status = 'INACTIVE');

create or replace function public.prevent_youth_membership_identity_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
begin
  if new.club_id <> old.club_id or new.user_id <> old.user_id then
    raise exception 'Youth club membership identity cannot be changed';
  end if;
  return new;
end;
$function$;

drop trigger if exists youth_club_members_identity_guard on public.youth_club_members;
create trigger youth_club_members_identity_guard
before update of club_id, user_id on public.youth_club_members
for each row execute function public.prevent_youth_membership_identity_change();
