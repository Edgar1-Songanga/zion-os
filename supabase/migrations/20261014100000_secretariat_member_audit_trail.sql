-- Record member-register mutations atomically with the underlying row change.
-- Store changed field names only; never copy member PII into audit metadata.

begin;

create or replace function public.audit_church_member_record_change()
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
      (new.organization_id, auth.uid(), 'church_member.created', 'church_member_record', new.id,
       jsonb_build_object('membership_status', new.membership_status));
    return new;
  end if;

  select array_agg(field_name order by field_name)
    into changed_fields
  from jsonb_each(to_jsonb(new)) as new_field(field_name, field_value)
  where field_name not in ('updated_at', 'updated_by')
    and (to_jsonb(old) -> field_name) is distinct from field_value;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
  values
    (new.organization_id, auth.uid(), 'church_member.updated', 'church_member_record', new.id,
     jsonb_build_object('changed_fields', coalesce(to_jsonb(changed_fields), '[]'::jsonb)));

  return new;
end;
$function$;

drop trigger if exists church_member_record_audit on public.church_member_records;
create trigger church_member_record_audit
after insert or update on public.church_member_records
for each row execute function public.audit_church_member_record_change();

revoke all on function public.audit_church_member_record_change() from public, anon, authenticated;

commit;
