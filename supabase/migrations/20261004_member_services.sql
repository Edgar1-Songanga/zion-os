-- ZION Member Services and Secretary workflow.
create table if not exists public.member_service_requests (
  id uuid primary key default gen_random_uuid(),
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  destination_organization_id uuid references public.organizations(id) on delete set null,
  service_type text not null check (service_type in ('MEMBERSHIP_TRANSFER','RECOMMENDATION_LETTER','CHILD_DEDICATION','BAPTISM_REQUEST','PASTORAL_VISIT','GENERAL_SECRETARY_SERVICE')),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','IN_REVIEW','APPROVED','REJECTED','CANCELLED','COMPLETED')),
  subject text not null,
  details jsonb not null default '{}'::jsonb,
  applicant_notes text,
  reviewer_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (service_type <> 'MEMBERSHIP_TRANSFER' or destination_organization_id is not null),
  check (destination_organization_id is null or destination_organization_id <> organization_id)
);
create index if not exists member_service_requests_applicant_idx on public.member_service_requests(applicant_user_id, created_at desc);
create index if not exists member_service_requests_org_status_idx on public.member_service_requests(organization_id, status, created_at desc);
create index if not exists member_service_requests_destination_idx on public.member_service_requests(destination_organization_id, status, created_at desc);

create table if not exists public.member_service_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.member_service_requests(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists member_service_events_request_idx on public.member_service_request_events(request_id, created_at desc);

insert into public.permissions (key, name, description)
values
  ('secretary.review', 'Review member services', 'Review and process member service requests'),
  ('membership.transfer.review', 'Review membership transfers', 'Review source and destination membership transfer requests')
on conflict (key) do nothing;

alter table public.member_service_requests enable row level security;
alter table public.member_service_request_events enable row level security;

drop policy if exists member_service_applicant_read on public.member_service_requests;
create policy member_service_applicant_read on public.member_service_requests for select to authenticated using (applicant_user_id = (select auth.uid()) or private.has_org_permission(organization_id, 'secretary.review') or (destination_organization_id is not null and private.has_org_permission(destination_organization_id, 'secretary.review')));
drop policy if exists member_service_applicant_insert on public.member_service_requests;
create policy member_service_applicant_insert on public.member_service_requests for insert to authenticated with check (applicant_user_id = (select auth.uid()) and private.is_org_member(organization_id));
drop policy if exists member_service_applicant_cancel on public.member_service_requests;
create policy member_service_applicant_cancel on public.member_service_requests for update to authenticated using (applicant_user_id = (select auth.uid()) and status in ('SUBMITTED','IN_REVIEW')) with check (applicant_user_id = (select auth.uid()) and status = 'CANCELLED');
drop policy if exists member_service_secretary_update on public.member_service_requests;
create policy member_service_secretary_update on public.member_service_requests for update to authenticated using (private.has_org_permission(organization_id, 'secretary.review') or (destination_organization_id is not null and private.has_org_permission(destination_organization_id, 'secretary.review'))) with check (private.has_org_permission(organization_id, 'secretary.review') or (destination_organization_id is not null and private.has_org_permission(destination_organization_id, 'secretary.review')));

drop policy if exists member_service_events_read on public.member_service_request_events;
create policy member_service_events_read on public.member_service_request_events for select to authenticated using (exists (select 1 from public.member_service_requests request where request.id = request_id and (request.applicant_user_id = (select auth.uid()) or private.has_org_permission(request.organization_id, 'secretary.review') or (request.destination_organization_id is not null and private.has_org_permission(request.destination_organization_id, 'secretary.review')))));
drop policy if exists member_service_events_insert on public.member_service_request_events;
create policy member_service_events_insert on public.member_service_request_events for insert to authenticated with check (actor_user_id = (select auth.uid()));

-- Notify the applicant and authorized secretaries when a request enters or changes workflow.
create or replace function public.member_service_request_notification()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare
  recipient uuid;
  label text;
begin
  label := case new.service_type
    when 'MEMBERSHIP_TRANSFER' then 'transferência de membro'
    when 'RECOMMENDATION_LETTER' then 'carta de recomendação'
    when 'CHILD_DEDICATION' then 'dedicação de criança'
    when 'BAPTISM_REQUEST' then 'pedido de batismo'
    when 'PASTORAL_VISIT' then 'visita pastoral'
    else 'serviço da secretaria'
  end;
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.notifications(user_id, type, title, body, channel, priority, data)
    values (new.applicant_user_id, 'member_service.status', 'Atualização do seu pedido', 'O pedido de ' || label || ' está agora: ' || new.status || '.', 'in_app', 'normal', jsonb_build_object('request_id', new.id, 'status', new.status));
    for recipient in
      select membership.user_id
      from public.organization_memberships membership
      join public.role_permissions role_permission on role_permission.role_id = membership.role_id
      join public.permissions permission on permission.id = role_permission.permission_id
      where membership.organization_id in (new.organization_id, coalesce(new.destination_organization_id, new.organization_id))
        and membership.status = 'ACTIVE'
        and permission.key = 'secretary.review'
        and membership.user_id <> new.applicant_user_id
    loop
      insert into public.notifications(user_id, type, title, body, channel, priority, data)
      values (recipient, 'member_service.review', 'Pedido para revisão', 'Existe um pedido de ' || label || ' para revisão.', 'in_app', 'normal', jsonb_build_object('request_id', new.id, 'status', new.status));
    end loop;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_member_service_request_notification on public.member_service_requests;
create trigger trg_member_service_request_notification after insert or update of status on public.member_service_requests for each row execute function public.member_service_request_notification();
