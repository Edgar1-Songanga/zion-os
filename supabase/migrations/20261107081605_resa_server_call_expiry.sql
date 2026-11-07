-- Server-side expiry for unanswered RESA calls.
-- The activation timestamp deliberately excludes all calls created before this migration,
-- including stale production rows that may belong to historical user activity.

create table if not exists private.resa_call_expiry_config (
  id boolean primary key default true check (id = true),
  activated_at timestamptz not null default clock_timestamp()
);

insert into private.resa_call_expiry_config (id)
values (true)
on conflict (id) do nothing;

revoke all on table private.resa_call_expiry_config from public, anon, authenticated;

create index if not exists resa_calls_ringing_expiry_idx
  on public.resa_calls (created_at)
  where status = 'ringing';

create or replace function private.expire_unanswered_resa_calls()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_activated_at timestamptz;
  v_expired integer := 0;
begin
  select activated_at
    into v_activated_at
  from private.resa_call_expiry_config
  where id = true;

  if v_activated_at is null then
    return 0;
  end if;

  update public.resa_calls
  set status = 'missed',
      ended_at = clock_timestamp()
  where status = 'ringing'
    and created_at >= v_activated_at
    and created_at <= clock_timestamp() - interval '60 seconds';

  get diagnostics v_expired = row_count;
  return v_expired;
end;
$function$;

revoke all on function private.expire_unanswered_resa_calls() from public, anon, authenticated;
grant execute on function private.expire_unanswered_resa_calls() to postgres;

do $schedule$
declare
  v_job_id bigint;
begin
  select jobid
    into v_job_id
  from cron.job
  where jobname = 'resa-expire-unanswered-calls';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'resa-expire-unanswered-calls',
    '* * * * *',
    'select private.expire_unanswered_resa_calls();'
  );
end;
$schedule$;
