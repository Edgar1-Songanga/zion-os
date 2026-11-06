\set ON_ERROR_STOP on

insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','host@example.test'),
 ('10000000-0000-4000-8000-000000000002','private@example.test'),
 ('10000000-0000-4000-8000-000000000003','community@example.test'),
 ('10000000-0000-4000-8000-000000000004','public@example.test'),
 ('10000000-0000-4000-8000-000000000005','manager@example.test');

-- Five failed attempts lock only this user/live pair; a correct password is denied while locked.
insert into public.resa_live_sessions(id,host_id,visibility,status,password_hash)
values (
 '20000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000001',
 'private','live',
 extensions.crypt('correct horse battery', extensions.gen_salt('bf'))
);

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
do $test$
declare i integer;
begin
  for i in 1..5 loop
    if public.resa_unlock_private_live(
      '20000000-0000-4000-8000-000000000001',
      'incorrect-password'
    ) then
      raise exception 'Incorrect password unexpectedly unlocked private Live';
    end if;
  end loop;

  if public.resa_unlock_private_live(
    '20000000-0000-4000-8000-000000000001',
    'correct horse battery'
  ) then
    raise exception 'Correct password bypassed an active lockout';
  end if;

  if not exists (
    select 1 from private.resa_live_password_attempts
     where live_id='20000000-0000-4000-8000-000000000001'
       and user_id='10000000-0000-4000-8000-000000000002'
       and failed_attempts=5 and locked_until > clock_timestamp()
  ) then
    raise exception 'Five failed attempts did not persist a lockout';
  end if;
end
$test$;

-- Expired lockouts permit a valid password and reset the counter without deleting
-- the serialization row, preserving safe behavior for concurrent requests.
update private.resa_live_password_attempts
   set locked_until = clock_timestamp() - interval '1 second'
 where live_id='20000000-0000-4000-8000-000000000001'
   and user_id='10000000-0000-4000-8000-000000000002';

do $test$
begin
  if not public.resa_unlock_private_live(
    '20000000-0000-4000-8000-000000000001',
    'correct horse battery'
  ) then
    raise exception 'Valid password was not accepted after lockout expiry';
  end if;

  if not exists (
    select 1 from private.resa_live_password_attempts
     where live_id='20000000-0000-4000-8000-000000000001'
       and user_id='10000000-0000-4000-8000-000000000002'
       and failed_attempts=0 and locked_until is null
  ) then
    raise exception 'Successful unlock did not reset the attempt counter';
  end if;
end
$test$;

-- Build two ministries/classes in one organization. Teacher/leader one must not
-- be able to purge expired records belonging to the other ministry/class.
insert into public.organizations(id) values ('30000000-0000-4000-8000-000000000001');
insert into public.ministries(id,organization_id,department) values
 ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','sabbath-school-personal-ministries'),
 ('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','other');
insert into public.ministry_leaders(ministry_id,user_id)
values ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003');
insert into public.sabbath_school_classes(id,organization_id,ministry_id,teacher_user_id) values
 ('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001' ,'10000000-0000-4000-8000-000000000003'),
 ('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004');
insert into public.sabbath_school_attendance_sessions(id,organization_id,class_id,expires_at) values
 ('60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',now()-interval '1 day'),
 ('60000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002',now()-interval '1 day');
insert into public.sabbath_school_attendance(id,organization_id,session_id,expires_at) values
 ('70000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',now()-interval '1 day'),
 ('70000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000002',now()-interval '1 day');
insert into public.sabbath_school_class_members(id,organization_id,class_id,expires_at) values
 ('80000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',now()-interval '1 day'),
 ('80000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002',now()-interval '1 day');

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
select public.purge_expired_department_records(
 '30000000-0000-4000-8000-000000000001','SABBATH_SCHOOL_ATTENDANCE'
);
do $test$
begin
  if exists (select 1 from public.sabbath_school_attendance_sessions where id='60000000-0000-4000-8000-000000000001')
     or exists (select 1 from public.sabbath_school_attendance where id='70000000-0000-4000-8000-000000000001')
     or exists (select 1 from public.sabbath_school_class_members where id='80000000-0000-4000-8000-000000000001') then
    raise exception 'Authorized teacher/ministry records were not purged';
  end if;
  if not exists (select 1 from public.sabbath_school_attendance_sessions where id='60000000-0000-4000-8000-000000000002')
     or not exists (select 1 from public.sabbath_school_attendance where id='70000000-0000-4000-8000-000000000002')
     or not exists (select 1 from public.sabbath_school_class_members where id='80000000-0000-4000-8000-000000000002') then
    raise exception 'Teacher/ministry purge crossed into another class';
  end if;
end
$test$;

-- Ministry leaders can purge follow-ups in their ministry, not another ministry.
insert into public.personal_ministry_follow_ups(id,organization_id,ministry_id,assigned_to,expires_at) values
 ('90000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003',now()-interval '1 day'),
 ('90000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004',now()-interval '1 day'),
 ('90000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004',now()-interval '1 day');

select public.purge_expired_department_records(
 '30000000-0000-4000-8000-000000000001','PERSONAL_MINISTRY_FOLLOW_UP'
);
do $test$
begin
  if exists (select 1 from public.personal_ministry_follow_ups where id in (
    '90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002'
  )) then
    raise exception 'Ministry leader records in their ministry were not purged';
  end if;
  if not exists (select 1 from public.personal_ministry_follow_ups where id='90000000-0000-4000-8000-000000000003') then
    raise exception 'Ministry leader purge crossed into another ministry';
  end if;
end
$test$;

-- An unrelated authenticated user cannot purge another ministry's attendance.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',false);
do $test$
begin
  begin
    perform public.purge_expired_department_records(
      '30000000-0000-4000-8000-000000000001','SABBATH_SCHOOL_ATTENDANCE'
    );
    raise exception 'Unauthorized purge unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end
$test$;

-- An organization manager retains organization-wide purge authority.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',false);
select set_config('test.zion_manager_org','30000000-0000-4000-8000-000000000001',false);
select public.purge_expired_department_records(
 '30000000-0000-4000-8000-000000000001','PERSONAL_MINISTRY_FOLLOW_UP'
);
do $test$
begin
  if exists (select 1 from public.personal_ministry_follow_ups where organization_id='30000000-0000-4000-8000-000000000001') then
    raise exception 'Organization manager could not purge the remaining expired records';
  end if;

  if has_function_privilege('anon','public.resa_unlock_private_live(uuid,text)','EXECUTE')
     or not has_function_privilege('authenticated','public.resa_unlock_private_live(uuid,text)','EXECUTE') then
    raise exception 'Private Live unlock RPC grants are not least-privilege';
  end if;

  if has_table_privilege('anon','private.resa_live_password_attempts','SELECT')
     or has_table_privilege('authenticated','private.resa_live_password_attempts','SELECT') then
    raise exception 'Untrusted role can read password attempt metadata';
  end if;
end
$test$;


-- Profile discovery must not enumerate on blank queries or reveal private profiles.
insert into public.profiles(id,display_name,first_name,last_name,avatar_url,privacy) values
 ('10000000-0000-4000-8000-000000000002','Private Alice','Alice','Private',null,'{"profile_visibility":"private"}'),
 ('10000000-0000-4000-8000-000000000003','Community Alice','Alice','Community',null,'{"profile_visibility":"community"}'),
 ('10000000-0000-4000-8000-000000000004','Public Alice','Alice','Public',null,'{"profile_visibility":"public"}');

do $test$
declare
  v_count integer;
  v_email text;
begin
  select count(*) into v_count from public.resa_search_profiles(' ',20);
  if v_count <> 0 then
    raise exception 'Blank profile search returned % profiles', v_count;
  end if;

  select count(*) into v_count from public.resa_search_profiles('Alice',20);
  if v_count <> 2 then
    raise exception 'Expected only community/public Alice profiles, got %', v_count;
  end if;

  if exists (
    select 1 from public.resa_search_profiles('Alice',20)
     where id='10000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'Private profile appeared in profile search';
  end if;

  select email into v_email
    from public.resa_search_profiles('Community Alice',20)
   where id='10000000-0000-4000-8000-000000000003';
  if v_email is not null then
    raise exception 'Community profile exposed its email address';
  end if;

  select email into v_email
    from public.resa_search_profiles('Public Alice',20)
   where id='10000000-0000-4000-8000-000000000004';
  if v_email <> 'public@example.test' then
    raise exception 'Explicitly public profile email behavior changed';
  end if;

  select count(*) into v_count
    from public.resa_profiles_for_ids(array[
      '10000000-0000-4000-8000-000000000002'::uuid,
      '10000000-0000-4000-8000-000000000003'::uuid,
      '10000000-0000-4000-8000-000000000004'::uuid
    ]);
  if v_count <> 2 then
    raise exception 'ID-based lookup did not preserve profile privacy';
  end if;

  if has_function_privilege('anon','public.resa_search_profiles(text,integer)','EXECUTE') then
    raise exception 'Anonymous users can execute profile search';
  end if;
end
$test$;

select 'RESA security and department purge scope regression passed' as result;
