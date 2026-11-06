\set ON_ERROR_STOP on
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set role authenticated;
select public.save_sabbath_school_attendance(
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc','2026-11-06','Lição 1',
 '[{"member_record_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","attendance_status":"PRESENT"},{"member_record_id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","attendance_status":"ABSENT"}]'::jsonb
);
create temporary table first_session as select id from public.sabbath_school_attendance_sessions;
select public.save_sabbath_school_attendance(
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc','2026-11-06','Lição 1 corrigida',
 '[{"member_record_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","attendance_status":"EXCUSED"},{"member_record_id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","attendance_status":"PRESENT"}]'::jsonb
);
do $$
begin
 if (select count(*) from public.sabbath_school_attendance_sessions) <> 1 then raise exception 'Correction created a duplicate session'; end if;
 if (select id from first_session) <> (select id from public.sabbath_school_attendance_sessions) then raise exception 'Correction replaced the session identity'; end if;
 if (select count(*) from public.sabbath_school_attendance) <> 2 then raise exception 'Correction did not replace the attendance set'; end if;
 if not exists(select 1 from public.sabbath_school_attendance where member_record_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd' and attendance_status='EXCUSED') then raise exception 'Corrected status missing'; end if;
 if not exists(select 1 from public.sabbath_school_attendance where member_record_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' and attendance_status='PRESENT') then raise exception 'Corrected second status missing'; end if;
end $$;
do $$
begin
 begin
  perform public.save_sabbath_school_attendance(
   'cccccccc-cccc-4ccc-8ccc-cccccccccccc','2026-11-06','Unauthorized',
   '[{"member_record_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","attendance_status":"PRESENT"}]'::jsonb
  );
  raise exception 'Unauthorized user unexpectedly saved attendance';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
