-- Enforce payroll approval as a distinct permission at the database boundary.
-- The function runs with the caller's JWT and does not bypass RLS.
create or replace function private.guard_payroll_run_approval()
returns trigger
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  if new.status = 'APPROVED'
     and (
       old.status is distinct from new.status
       or new.approved_by is distinct from old.approved_by
       or new.approved_at is distinct from old.approved_at
     ) then
    if auth.uid() is null
       or not private.has_org_permission_in_hierarchy(new.organization_id, 'payroll.approve') then
      raise exception 'payroll_approval_permission_required' using errcode = '42501';
    end if;

    if old.status <> 'REVIEW' then
      raise exception 'payroll_run_must_be_in_review' using errcode = '23514';
    end if;

    new.approved_by := auth.uid();
    new.approved_at := coalesce(new.approved_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists payroll_run_approval_guard on public.payroll_runs;
create trigger payroll_run_approval_guard
before update on public.payroll_runs
for each row execute function private.guard_payroll_run_approval();

create or replace function public.approve_payroll_run(
  p_organization_id uuid,
  p_run_id uuid
)
returns setof public.payroll_runs
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not private.has_org_permission_in_hierarchy(p_organization_id, 'payroll.approve') then
    raise exception 'payroll_approval_permission_required' using errcode = '42501';
  end if;

  return query
    update public.payroll_runs
       set status = 'APPROVED',
           approved_by = auth.uid(),
           approved_at = now()
     where organization_id = p_organization_id
       and id = p_run_id
       and status = 'REVIEW'
    returning *;
end;
$$;

revoke all on function public.approve_payroll_run(uuid, uuid) from public, anon;
grant execute on function public.approve_payroll_run(uuid, uuid) to authenticated;
revoke all on function private.guard_payroll_run_approval() from public, anon, authenticated;
