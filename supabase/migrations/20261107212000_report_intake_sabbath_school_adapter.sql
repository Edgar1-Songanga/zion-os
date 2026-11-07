-- Import a scanned Sabbath School roll only after an authorized human review.
-- Member identity is resolved by stable ZION member_record_id (normally encoded in
-- a QR); OCR names are never fuzzy-matched into attendance automatically.
begin;

alter table public.report_intake_documents
  add column if not exists attendance_session_id uuid
    references public.sabbath_school_attendance_sessions(id) on delete set null;

alter table public.report_intake_documents
  drop constraint if exists report_intake_operational_domain_check;
alter table public.report_intake_documents
  add constraint report_intake_operational_domain_check
  check (operational_data_domain is null or operational_data_domain in ('STEWARDSHIP_PERIOD','SABBATH_SCHOOL_ATTENDANCE'));

alter table public.report_intake_documents
  drop constraint if exists report_intake_operational_link_pair_check;
alter table public.report_intake_documents
  add constraint report_intake_operational_link_pair_check
  check (
    (operational_data_domain is null and operational_record_id is null and attendance_session_id is null)
    or (operational_data_domain = 'STEWARDSHIP_PERIOD' and operational_record_id is not null and attendance_session_id is null)
    or (operational_data_domain = 'SABBATH_SCHOOL_ATTENDANCE' and operational_record_id is null)
  );

-- Close a NULL-boolean authorization edge case in the attendance RPC:
-- an unassigned class has teacher_user_id NULL, which must never make IF NOT
-- (manager OR teacher OR leader) evaluate to NULL and skip the rejection.
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
as $attendance$
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
    coalesce(private.has_org_permission(target_class.organization_id, 'organization.manage'), false)
    or coalesce(target_class.teacher_user_id = (select auth.uid()), false)
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
$attendance$;

revoke all on function public.save_sabbath_school_attendance(uuid, date, text, jsonb) from public, anon;
grant execute on function public.save_sabbath_school_attendance(uuid, date, text, jsonb) to authenticated;

create or replace function public.review_report_intake_document(
  p_document_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns public.report_intake_documents
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_document public.report_intake_documents;
  v_report_id uuid;
  v_operational_record_id uuid;
  v_attendance_session_id uuid;
  v_department text;
  v_period_start date;
  v_period_end date;
  v_activities_count integer;
  v_programs_completed_count integer;
  v_participants_count integer;
  v_materials_distributed_count integer;
  v_fields jsonb;
  v_class public.sabbath_school_classes;
  v_class_id uuid;
  v_attendance_date date;
  v_lesson_reference text;
  v_attendance_records jsonb;
  v_attendance_count integer;
  v_roster_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_decision not in ('APPROVED','REJECTED') then
    raise exception 'Decision must be APPROVED or REJECTED' using errcode = '22023';
  end if;
  if p_review_notes is not null and length(p_review_notes) > 4000 then
    raise exception 'Review notes are too long' using errcode = '22023';
  end if;

  select * into v_document
  from public.report_intake_documents
  where id = p_document_id
  for update;

  if not found then
    raise exception 'Report intake document not found' using errcode = 'P0002';
  end if;
  if v_document.status <> 'PENDING_REVIEW' then
    raise exception 'Only pending documents can be reviewed' using errcode = '55000';
  end if;

  v_fields := coalesce(v_document.extracted_fields, '{}'::jsonb);

  -- Resolve the Sabbath School class before authorization so that a class
  -- teacher can review only a report for their own active class.
  if upper(trim(coalesce(v_document.report_type, ''))) = 'SABBATH_SCHOOL_ATTENDANCE' then
    if jsonb_typeof(v_fields) <> 'object'
      or coalesce(jsonb_typeof(v_fields->'attendance_records'),'') <> 'array'
      or coalesce(v_fields->>'class_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(v_fields->>'attendance_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      or jsonb_typeof(v_fields->'attendance_records') <> 'array'
      or jsonb_array_length(v_fields->'attendance_records') < 1
      or jsonb_array_length(v_fields->'attendance_records') > 1000
    then
      raise exception 'Sabbath School report requires class_id, attendance_date and attendance_records' using errcode = '22023';
    end if;

    v_class_id := (v_fields->>'class_id')::uuid;
    v_attendance_date := (v_fields->>'attendance_date')::date;
    v_lesson_reference := nullif(trim(coalesce(v_fields->>'lesson_reference','')), '');
    v_attendance_records := v_fields->'attendance_records';

    if v_attendance_date > current_date
      or (v_lesson_reference is not null and length(v_lesson_reference) > 160)
    then
      raise exception 'Attendance date or lesson reference is invalid' using errcode = '22023';
    end if;

    select * into v_class
    from public.sabbath_school_classes c
    where c.id = v_class_id
      and c.organization_id = v_document.organization_id
      and c.ministry_id = v_document.ministry_id
      and c.is_active
    for update;

    if v_class.id is null then
      raise exception 'The selected active class does not belong to this organization and department' using errcode = '22023';
    end if;

    if exists (
      select 1 from public.sabbath_school_attendance_sessions s
      where s.class_id = v_class.id and s.attendance_date = v_attendance_date
    ) then
      raise exception 'Attendance already exists for this class and date. Use the dedicated correction workflow instead of importing over an existing session.' using errcode = '55000';
    end if;
  end if;

  if not (
    private.has_org_permission(v_document.organization_id, 'organization.manage')
    or (
      v_document.ministry_id is not null
      and exists (
        select 1 from public.ministry_leaders l
        where l.ministry_id = v_document.ministry_id
          and l.user_id = auth.uid()
          and l.verified = true
      )
    )
    or (
      v_class.id is not null
      and v_class.teacher_user_id = auth.uid()
    )
  ) then
    raise exception 'Department reviewer permission required' using errcode = '42501';
  end if;

  if p_decision = 'APPROVED' then
    if v_document.ministry_id is null or not exists (
      select 1 from public.ministries m
      where m.id = v_document.ministry_id
        and m.organization_id = v_document.organization_id
    ) then
      raise exception 'A valid department destination is required before approval' using errcode = '22023';
    end if;

    select m.department into v_department
    from public.ministries m
    where m.id = v_document.ministry_id
      and m.organization_id = v_document.organization_id;

    if upper(trim(coalesce(v_document.report_type, ''))) = 'STEWARDSHIP_PERIOD' then
      if v_department <> 'stewardship' then
        raise exception 'STEWARDSHIP_PERIOD reports must be routed to the Stewardship department' using errcode = '22023';
      end if;

      if jsonb_typeof(v_fields) <> 'object'
        or coalesce(v_fields->>'period_start', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or coalesce(v_fields->>'period_end', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or coalesce(v_fields->>'activities_count', '') !~ '^[0-9]{1,5}$'
        or coalesce(v_fields->>'programs_completed_count', '') !~ '^[0-9]{1,5}$'
        or coalesce(v_fields->>'materials_distributed_count', '') !~ '^[0-9]{1,6}$'
        or (nullif(v_fields->>'participants_count', '') is not null
          and v_fields->>'participants_count' !~ '^[0-9]{1,6}$')
      then
        raise exception 'Stewardship report fields are invalid' using errcode = '22023';
      end if;

      v_period_start := (v_fields->>'period_start')::date;
      v_period_end := (v_fields->>'period_end')::date;
      v_activities_count := (v_fields->>'activities_count')::integer;
      v_programs_completed_count := (v_fields->>'programs_completed_count')::integer;
      v_materials_distributed_count := (v_fields->>'materials_distributed_count')::integer;
      v_participants_count := nullif(v_fields->>'participants_count', '')::integer;

      if v_period_end < v_period_start
        or v_activities_count not between 0 and 10000
        or v_programs_completed_count not between 0 and 10000
        or v_materials_distributed_count not between 0 and 100000
        or (v_participants_count is not null and v_participants_count not between 5 and 100000)
      then
        raise exception 'Stewardship report values are outside allowed ranges' using errcode = '22023';
      end if;

      insert into public.stewardship_period_reports (
        organization_id, ministry_id, period_start, period_end,
        activities_count, programs_completed_count, participants_count,
        materials_distributed_count, submitted_by
      ) values (
        v_document.organization_id, v_document.ministry_id, v_period_start, v_period_end,
        v_activities_count, v_programs_completed_count, v_participants_count,
        v_materials_distributed_count, v_document.submitted_by
      )
      returning id into v_operational_record_id;
    elsif upper(trim(coalesce(v_document.report_type, ''))) = 'SABBATH_SCHOOL_ATTENDANCE' then
      if v_department <> 'sabbath-school-personal-ministries' then
        raise exception 'SABBATH_SCHOOL_ATTENDANCE reports must be routed to the Sabbath School department' using errcode = '22023';
      end if;

      select count(*) into v_attendance_count
      from jsonb_to_recordset(v_attendance_records) as x(member_record_id text, attendance_status text)
      where coalesce(x.member_record_id,'') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        and x.attendance_status in ('PRESENT','ABSENT','EXCUSED');

      if v_attendance_count <> jsonb_array_length(v_attendance_records)
        or v_attendance_count <> (
          select count(distinct x.member_record_id)
          from jsonb_to_recordset(v_attendance_records) as x(member_record_id text, attendance_status text)
        )
      then
        raise exception 'Every attendance row must contain a unique member_record_id and a valid attendance_status' using errcode = '22023';
      end if;

      select count(*) into v_roster_count
      from public.sabbath_school_class_members cm
      join public.church_member_records mr
        on mr.id = cm.member_record_id and mr.organization_id = cm.organization_id
      where cm.class_id = v_class.id
        and cm.organization_id = v_class.organization_id
        and cm.expires_at > now()
        and mr.membership_status = 'ACTIVE';

      if v_attendance_count <> v_roster_count then
        raise exception 'The scanned attendance list must account for every active member in this class. Match member QR codes or complete the roster before approval.' using errcode = '22023';
      end if;

      perform public.save_sabbath_school_attendance(
        v_class.id, v_attendance_date, v_lesson_reference, v_attendance_records
      );

      select s.id into v_attendance_session_id
      from public.sabbath_school_attendance_sessions s
      where s.class_id = v_class.id and s.attendance_date = v_attendance_date;
    end if;

    insert into public.ministry_reports (ministry_id, title, status, submitted_by)
    values (v_document.ministry_id, v_document.title, 'APPROVED', v_document.submitted_by)
    returning id into v_report_id;
  end if;

  update public.report_intake_documents
  set status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = nullif(trim(coalesce(p_review_notes, '')), ''),
      ministry_report_id = coalesce(v_report_id, ministry_report_id),
      operational_data_domain = case
        when v_operational_record_id is not null then 'STEWARDSHIP_PERIOD'
        when v_attendance_session_id is not null then 'SABBATH_SCHOOL_ATTENDANCE'
        else operational_data_domain
      end,
      operational_record_id = coalesce(v_operational_record_id, operational_record_id),
      attendance_session_id = coalesce(v_attendance_session_id, attendance_session_id),
      updated_at = now()
  where id = p_document_id
  returning * into v_document;

  return v_document;
end;
$$;

revoke all on function public.review_report_intake_document(uuid,text,text) from public, anon;
grant execute on function public.review_report_intake_document(uuid,text,text) to authenticated;

comment on column public.report_intake_documents.attendance_session_id is
  'Attendance session created by the Sabbath School report adapter after authorized human approval.';

commit;
