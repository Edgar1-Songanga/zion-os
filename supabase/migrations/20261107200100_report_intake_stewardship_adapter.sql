-- First operational report adapter: aggregate stewardship period reports.
-- The adapter runs only after an authorized human approval and writes aggregate
-- metrics only; it never writes donor, offering, or member-level records.
begin;

alter table public.report_intake_documents
  add column if not exists operational_data_domain text,
  add column if not exists operational_record_id uuid references public.stewardship_period_reports(id);

alter table public.report_intake_documents
  drop constraint if exists report_intake_operational_domain_check;
alter table public.report_intake_documents
  add constraint report_intake_operational_domain_check
  check (operational_data_domain is null or operational_data_domain = 'STEWARDSHIP_PERIOD'),
  add constraint report_intake_operational_link_pair_check
  check ((operational_data_domain is null) = (operational_record_id is null));

create index if not exists report_intake_operational_record_idx
  on public.report_intake_documents(operational_data_domain, operational_record_id)
  where operational_record_id is not null;

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
  v_department text;
  v_period_start date;
  v_period_end date;
  v_activities_count integer;
  v_programs_completed_count integer;
  v_participants_count integer;
  v_materials_distributed_count integer;
  v_fields jsonb;
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

    -- Explicit opt-in report type prevents incidental AI/QR fields from
    -- triggering an operational write.
    if upper(trim(coalesce(v_document.report_type, ''))) = 'STEWARDSHIP_PERIOD' then
      if v_department <> 'stewardship' then
        raise exception 'STEWARDSHIP_PERIOD reports must be routed to the Stewardship department' using errcode = '22023';
      end if;

      v_fields := coalesce(v_document.extracted_fields, '{}'::jsonb);
      if jsonb_typeof(v_fields) <> 'object'
        or coalesce(v_fields->>'period_start', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or coalesce(v_fields->>'period_end', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or coalesce(v_fields->>'activities_count', '') !~ '^[0-9]{1,5}$'
        or coalesce(v_fields->>'programs_completed_count', '') !~ '^[0-9]{1,5}$'
        or coalesce(v_fields->>'materials_distributed_count', '') !~ '^[0-9]{1,6}$'
        or (nullif(v_fields->>'participants_count', '') is not null
          and v_fields->>'participants_count' !~ '^[0-9]{1,6}$')
      then
        raise exception 'Stewardship report requires valid period_start, period_end, activities_count, programs_completed_count and materials_distributed_count fields' using errcode = '22023';
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
        raise exception 'Stewardship report values are outside the allowed ranges or the reporting period is invalid' using errcode = '22023';
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
      operational_data_domain = case when v_operational_record_id is not null then 'STEWARDSHIP_PERIOD' else operational_data_domain end,
      operational_record_id = coalesce(v_operational_record_id, operational_record_id),
      updated_at = now()
  where id = p_document_id
  returning * into v_document;

  return v_document;
end;
$$;

revoke all on function public.review_report_intake_document(uuid,text,text) from public;
grant execute on function public.review_report_intake_document(uuid,text,text) to authenticated;

comment on column public.report_intake_documents.operational_data_domain is
  'Explicit operational adapter applied after human approval; currently supports aggregate STEWARDSHIP_PERIOD reports only.';
comment on column public.report_intake_documents.operational_record_id is
  'Identifier of the operational row created by the approved department adapter.';

commit;
