begin;

alter table public.resa_creator_schedules
  add column if not exists publish_visibility text not null default 'public';

do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.resa_creator_schedules'::regclass
      and conname = 'resa_creator_schedules_publish_visibility_check'
  ) then
    alter table public.resa_creator_schedules
      add constraint resa_creator_schedules_publish_visibility_check
      check (publish_visibility in ('public','followers','community','organization'));
  end if;
end;
$constraint$;

create or replace function public.resa_schedule_content(
  p_content_id uuid,
  p_scheduled_for timestamptz,
  p_publish_visibility text default null
)
returns public.resa_creator_schedules
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_visibility text;
  v_schedule public.resa_creator_schedules;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_scheduled_for is null or p_scheduled_for <= now() then
    raise exception 'scheduled_for must be in the future' using errcode = '22023';
  end if;

  select c.visibility
    into v_visibility
  from public.resa_contents c
  where c.id = p_content_id and c.author_id = v_actor
  for update;

  if not found then
    raise exception 'Content not found or not owned by this creator' using errcode = '42501';
  end if;

  if p_publish_visibility is null then
    select s.publish_visibility
      into v_visibility
    from public.resa_creator_schedules s
    where s.content_id = p_content_id and s.creator_id = v_actor
    for update;
    if not found then
      select c.visibility
        into v_visibility
      from public.resa_contents c
      where c.id = p_content_id and c.author_id = v_actor;
    end if;
  else
    v_visibility := p_publish_visibility;
  end if;
  if v_visibility not in ('public','followers','community','organization') then
    raise exception 'Invalid publish visibility' using errcode = '22023';
  end if;

  update public.resa_contents
  set visibility = 'private', updated_at = now()
  where id = p_content_id and author_id = v_actor;

  insert into public.resa_creator_schedules
    (creator_id, content_id, scheduled_for, status, failure_reason, publish_visibility)
  values
    (v_actor, p_content_id, p_scheduled_for, 'scheduled', null, v_visibility)
  on conflict (content_id) do update
    set scheduled_for = excluded.scheduled_for,
        status = 'scheduled',
        failure_reason = null,
        publish_visibility = excluded.publish_visibility
    where public.resa_creator_schedules.creator_id = v_actor
  returning * into v_schedule;

  if v_schedule.id is null then
    raise exception 'Schedule already belongs to another creator' using errcode = '42501';
  end if;
  return v_schedule;
end;
$function$;

create or replace function public.resa_create_scheduled_content(
  p_title text,
  p_body text,
  p_type text,
  p_publish_visibility text,
  p_language text,
  p_scheduled_for timestamptz
)
returns public.resa_creator_schedules
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $function$
declare
  v_actor uuid := auth.uid();
  v_content_id uuid;
  v_schedule public.resa_creator_schedules;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_scheduled_for is null or p_scheduled_for <= now() then
    raise exception 'scheduled_for must be in the future' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null
     and nullif(btrim(coalesce(p_body, '')), '') is null then
    raise exception 'title or body is required' using errcode = '22023';
  end if;
  -- The current Creator Studio form has no community/organization selector.
  -- Do not create audience-scoped posts without a concrete target.
  if coalesce(p_publish_visibility, 'public') not in ('public','followers') then
    raise exception 'New scheduled posts must target public or followers audiences' using errcode = '22023';
  end if;

  insert into public.resa_contents
    (author_id, type, title, body, visibility, language)
  values
    (v_actor, coalesce(nullif(btrim(p_type), ''), 'text'),
     nullif(btrim(coalesce(p_title, '')), ''),
     nullif(btrim(coalesce(p_body, '')), ''),
     'private', coalesce(nullif(btrim(p_language), ''), 'pt'))
  returning id into v_content_id;

  insert into public.resa_creator_schedules
    (creator_id, content_id, scheduled_for, status, publish_visibility)
  values
    (v_actor, v_content_id, p_scheduled_for, 'scheduled', coalesce(p_publish_visibility, 'public'))
  returning * into v_schedule;

  return v_schedule;
end;
$function$;

create or replace function private.publish_due_resa_creator_schedules()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $function$
declare
  v_schedule record;
  v_published integer := 0;
begin
  for v_schedule in
    select s.id, s.creator_id, s.content_id, s.publish_visibility
    from public.resa_creator_schedules s
    where s.status = 'scheduled' and s.scheduled_for <= now()
    order by s.scheduled_for asc
    for update skip locked
    limit 100
  loop
    update public.resa_contents c
    set visibility = v_schedule.publish_visibility, updated_at = now()
    where c.id = v_schedule.content_id and c.author_id = v_schedule.creator_id;

    if found then
      update public.resa_creator_schedules
      set status = 'published', failure_reason = null, updated_at = now()
      where id = v_schedule.id and status = 'scheduled';
      v_published := v_published + 1;
    else
      update public.resa_creator_schedules
      set status = 'failed', failure_reason = 'Scheduled content is no longer available to its creator', updated_at = now()
      where id = v_schedule.id and status = 'scheduled';
    end if;
  end loop;
  return v_published;
end;
$function$;

revoke all on function public.resa_schedule_content(uuid,timestamptz,text) from public, anon;
revoke all on function public.resa_create_scheduled_content(text,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.resa_schedule_content(uuid,timestamptz,text) to authenticated;
grant execute on function public.resa_create_scheduled_content(text,text,text,text,text,timestamptz) to authenticated;
revoke all on function private.publish_due_resa_creator_schedules() from public, anon, authenticated;

do $cron$
declare
  v_job record;
begin
  for v_job in select jobid from cron.job where jobname = 'resa-publish-scheduled-content'
  loop
    perform cron.unschedule(v_job.jobid);
  end loop;
  perform cron.schedule(
    'resa-publish-scheduled-content',
    '* * * * *',
    'select private.publish_due_resa_creator_schedules();'
  );
end;
$cron$;

commit;
