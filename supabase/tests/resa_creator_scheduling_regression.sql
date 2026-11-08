\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email)
values ('90000000-0000-4000-8000-000000000001','resa-scheduler-regression@example.test')
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',false);
set role authenticated;

do $test$
declare
  v_schedule public.resa_creator_schedules;
begin
  select * into v_schedule
  from public.resa_create_scheduled_content(
    'Scheduled regression',
    'This content must remain private until the scheduled time.',
    'text',
    'public',
    'pt',
    now() + interval '2 days'
  );

  if v_schedule.id is null or v_schedule.status <> 'scheduled' then
    raise exception 'Scheduled content was not created';
  end if;

  if not exists (
    select 1 from public.resa_contents
    where id = v_schedule.content_id
      and author_id = auth.uid()
      and visibility = 'private'
  ) then
    raise exception 'Scheduled content was not private before publication';
  end if;
end;
$test$;

reset role;

update public.resa_creator_schedules
set scheduled_for = now() - interval '1 minute'
where creator_id = '90000000-0000-4000-8000-000000000001'
  and status = 'scheduled';

select private.publish_due_resa_creator_schedules();

do $test$
begin
  if not exists (
    select 1
    from public.resa_creator_schedules s
    join public.resa_contents c on c.id = s.content_id
    where s.creator_id = '90000000-0000-4000-8000-000000000001'
      and s.status = 'published'
      and c.visibility = 'public'
  ) then
    raise exception 'Due scheduled content was not published';
  end if;
end;
$test$;

rollback;
