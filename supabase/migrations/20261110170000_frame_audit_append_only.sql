-- Frame lifecycle audit entries must be append-only for all application roles.
begin;

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  raise exception 'Audit log entries are append-only'
    using errcode = '55000';
end;
$function$;

revoke all on function public.prevent_audit_log_mutation() from public, anon, authenticated;

drop trigger if exists audit_logs_append_only_guard on public.audit_logs;
create trigger audit_logs_append_only_guard
before update or delete on public.audit_logs
for each row execute function public.prevent_audit_log_mutation();

comment on function public.prevent_audit_log_mutation() is
  'Rejects mutation or deletion of audit log rows. Frame and application audit history is append-only.';

commit;
