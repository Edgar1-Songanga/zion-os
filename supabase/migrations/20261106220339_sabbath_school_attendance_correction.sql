begin;

-- Allow authorized teachers and ministry leaders to correct an existing attendance
-- session for the same class/date. The operation is atomic: session metadata and
-- the complete attendance set are replaced in one transaction.
create or replace function public.save_sabbath_school_attendance(
  p_class_id uuid,
  p_attendance_date date,
  p_lesson_reference text,
  p_records jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  target_class public.sabbath_school_classes%rowtype;
  saved_session public.sabbath_school_attendance_sessions%rowtype;
  record_count integer;
  invalid_count integer;
begin
  if p_class_id is null or p_attendance_date is null or p_attendance_date > current_date then
    raise exception 'Class and a valid attendance date (today or earlier) are required' using errcode = '22023';
  end if;
  if p_lesson_reference is not null and pg_catalog.length(pg_catalog.btrim(p_lesson_reference)) > 160 then
    raise exception 'Lesson reference cannot exceed 160 characters' using errcode = '22023';
  end if;
  if p_records is null or pg_catalog.jsonb_typeof(p_records) <> 'array'
     or pg_catalog.jsonb_array_length(p_records) < 1
     or pg_catalog.jsonb_array_length(p_records) > 1000 then
    raise exception 'Attendance records must be a non-empty array of at most 1000 rows' using errcode = '22023';
  end if;

  select * into target_class
  from public.sabbath_school_classes c
  where c.id = p_class_id and c.is_active
  for update;

  if target_class.id is null or not (
    private.has_org_permission(target_class.organization_id, 'organization.manage')
    or target_class.teacher_user_id = (select auth.uid())
    or exists (
      select 1 from public.ministry_leaders ml
      where ml.ministry_id = target_class.ministry_id and ml.user_id = (select auth.uid())
    )
  ) then
    raise exception 'Class not found or not authorized' using errcode = '42501';
  end if;

  select count(*) into record_count
  from pg_catalog.jsonb_to_recordset(p_records) as x(member_record_id uuid, attendance_status text);

  select count(*) into invalid_count
  from pg_catalog.jsonb_to_recordset(p_records) as x(member_record_id uuid, attendance_status text)
  where x.member_record_id is null
     or x.attendance_status is null
     or x.attendance_status not in ('PRESENT', 'ABSENT', 'EXCUSED')
     or not exists (
       select 1
       from public.sabbath_school_class_members cm
       join public.church_member_records mr
         on mr.id = cm.member_record_id and mr.organization_id = cm.organization_id
       where cm.class_id = p_class_id
         and cm.member_record_id = x.member_record_id
         and cm.expires_at > pg_catalog.now()
         and mr.membership_status = 'ACTIVE'
     );

  if invalid_count > 0 or record_count <> (
    select count(distinct x.member_record_id)
    from pg_catalog.jsonb_to_recordset(p_records) as x(member_record_id uuid, attendance_status text)
  ) then
    raise exception 'Every attendance row must be unique and refer to an active class member' using errcode = '22023';
  end if;

  insert into public.sabbath_school_attendance_sessions(
    class_id, organization_id, attendance_date, lesson_reference, recorded_by
  )
  values (
    target_class.id,
    target_class.organization_id,
    p_attendance_date,
    nullif(pg_catalog.btrim(p_lesson_reference), ''),
    (select auth.uid())
  )
  on conflict (class_id, attendance_date) do update
    set lesson_reference = excluded.lesson_reference,
        recorded_by = (select auth.uid()),
        recorded_at = pg_catalog.clock_timestamp(),
        expires_at = excluded.expires_at
  returning * into saved_session;

  delete from public.sabbath_school_attendance a
  where a.session_id = saved_session.id;

  insert into public.sabbath_school_attendance(
    session_id, organization_id, member_record_id, attendance_status
  )
  select saved_session.id, target_class.organization_id, x.member_record_id, x.attendance_status
  from pg_catalog.jsonb_to_recordset(p_records) as x(member_record_id uuid, attendance_status text);

  return pg_catalog.to_jsonb(saved_session);
end;
$$;

revoke all on function public.save_sabbath_school_attendance(uuid, date, text, jsonb) from public, anon;
grant execute on function public.save_sabbath_school_attendance(uuid, date, text, jsonb) to authenticated;

commit;
