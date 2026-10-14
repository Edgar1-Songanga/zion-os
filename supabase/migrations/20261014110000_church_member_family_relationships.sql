-- Family links are separate from platform account memberships.
-- Both member references are constrained to the same ecclesiastical organization.

begin;

create unique index if not exists church_member_records_id_org_unique
  on public.church_member_records (id, organization_id);

create table if not exists public.church_member_family_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  member_record_id uuid not null,
  related_member_record_id uuid not null,
  relationship_type text not null,
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint church_member_family_not_self check (member_record_id <> related_member_record_id),
  constraint church_member_family_relationship_type_check check (
    relationship_type in ('PARENT_OF', 'CHILD_OF', 'SPOUSE', 'SIBLING', 'GUARDIAN_OF', 'WARD_OF', 'OTHER')
  ),
  constraint church_member_family_member_org_fk
    foreign key (member_record_id, organization_id)
    references public.church_member_records (id, organization_id) on delete cascade,
  constraint church_member_family_related_org_fk
    foreign key (related_member_record_id, organization_id)
    references public.church_member_records (id, organization_id) on delete cascade
);

create unique index if not exists church_member_family_active_unique
  on public.church_member_family_relationships
    (organization_id, member_record_id, related_member_record_id, relationship_type)
  where is_active;

create index if not exists church_member_family_member_idx
  on public.church_member_family_relationships (organization_id, member_record_id, is_active);

create index if not exists church_member_family_related_idx
  on public.church_member_family_relationships (organization_id, related_member_record_id, is_active);

alter table public.church_member_family_relationships enable row level security;
revoke all on public.church_member_family_relationships from anon;
grant select, insert, update on public.church_member_family_relationships to authenticated;

drop policy if exists church_member_family_read on public.church_member_family_relationships;
create policy church_member_family_read
on public.church_member_family_relationships
for select to authenticated
using (private.has_org_permission(organization_id, 'church.members.read'));

drop policy if exists church_member_family_manage on public.church_member_family_relationships;
create policy church_member_family_manage
on public.church_member_family_relationships
for insert to authenticated
with check (
  private.has_org_permission(organization_id, 'church.members.manage')
  and created_by = (select auth.uid())
);

drop policy if exists church_member_family_update on public.church_member_family_relationships;
create policy church_member_family_update
on public.church_member_family_relationships
for update to authenticated
using (private.has_org_permission(organization_id, 'church.members.manage'))
with check (private.has_org_permission(organization_id, 'church.members.manage'));

create or replace function public.touch_church_member_family_relationship()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

drop trigger if exists church_member_family_touch on public.church_member_family_relationships;
create trigger church_member_family_touch
before update on public.church_member_family_relationships
for each row execute function public.touch_church_member_family_relationship();

create or replace function public.audit_church_member_family_relationship_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  changed_fields text[];
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs
      (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
    values
      (new.organization_id, auth.uid(), 'church_member_family.created',
       'church_member_family_relationship', new.id,
       jsonb_build_object('relationship_type', new.relationship_type));
    return new;
  end if;

  select array_agg(field_name order by field_name)
    into changed_fields
  from jsonb_each(to_jsonb(new)) as new_field(field_name, field_value)
  where field_name not in ('updated_at')
    and (to_jsonb(old) -> field_name) is distinct from field_value;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
  values
    (new.organization_id, auth.uid(), 'church_member_family.updated',
     'church_member_family_relationship', new.id,
     jsonb_build_object('changed_fields', coalesce(to_jsonb(changed_fields), '[]'::jsonb)));

  return new;
end;
$function$;

drop trigger if exists church_member_family_audit on public.church_member_family_relationships;
create trigger church_member_family_audit
after insert or update on public.church_member_family_relationships
for each row execute function public.audit_church_member_family_relationship_change();

revoke all on function public.audit_church_member_family_relationship_change() from public, anon, authenticated;
revoke all on function public.touch_church_member_family_relationship() from public, anon, authenticated;

commit;
