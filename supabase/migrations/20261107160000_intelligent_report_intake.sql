-- Intelligent report intake: private source documents, department routing and human approval.
begin;

create table if not exists public.report_intake_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ministry_id uuid references public.ministries(id) on delete set null,
  title text not null check (length(trim(title)) between 2 and 240),
  original_filename text not null check (length(original_filename) between 1 and 255),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size bigint not null check (byte_size between 1 and 20971520),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  extracted_text text not null default '' check (length(extracted_text) <= 100000),
  qr_payload text check (qr_payload is null or length(qr_payload) <= 2048),
  classification_department text,
  classification_confidence numeric(5,4) not null default 0 check (classification_confidence between 0 and 1),
  classification_method text not null default 'RULES' check (classification_method in ('RULES','QR','MANUAL','AI')),
  status text not null default 'PENDING_REVIEW' check (status in ('PENDING_REVIEW','APPROVED','REJECTED')),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text check (review_notes is null or length(review_notes) <= 4000),
  ministry_report_id uuid references public.ministry_reports(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((reviewed_by is null and reviewed_at is null) or (reviewed_by is not null and reviewed_at is not null)),
  check (ministry_id is null or classification_department is not null)
);

create index if not exists report_intake_org_status_idx
  on public.report_intake_documents(organization_id, status, submitted_at desc);
create index if not exists report_intake_ministry_status_idx
  on public.report_intake_documents(ministry_id, status, submitted_at desc);
create index if not exists report_intake_submitter_idx
  on public.report_intake_documents(submitted_by, submitted_at desc);

alter table public.report_intake_documents enable row level security;

drop policy if exists report_intake_read_scoped on public.report_intake_documents;
create policy report_intake_read_scoped on public.report_intake_documents
for select to authenticated
using (
  submitted_by = (select auth.uid())
  or private.has_org_permission(organization_id, 'organization.manage')
  or (
    ministry_id is not null
    and exists (
      select 1 from public.ministry_leaders l
      where l.ministry_id = report_intake_documents.ministry_id
        and l.user_id = (select auth.uid())
        and l.verified = true
    )
  )
);

drop policy if exists report_intake_submit_org_member on public.report_intake_documents;
create policy report_intake_submit_org_member on public.report_intake_documents
for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and private.is_org_member(organization_id)
  and (
    ministry_id is null
    or exists (
      select 1 from public.ministries m
      where m.id = ministry_id and m.organization_id = report_intake_documents.organization_id
    )
  )
);

drop policy if exists report_intake_review_scoped on public.report_intake_documents;

-- Documents are stored privately under organization/ministry/uploader/object.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-intake-private', 'report-intake-private', false, 20971520, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 20971520,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists report_intake_storage_insert on storage.objects;
create policy report_intake_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'report-intake-private'
  and (storage.foldername(name))[3] = (select auth.uid())::text
  and private.is_org_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists report_intake_storage_read on storage.objects;
create policy report_intake_storage_read on storage.objects
for select to authenticated
using (
  bucket_id = 'report-intake-private'
  and (
    (storage.foldername(name))[3] = (select auth.uid())::text
    or private.has_org_permission(((storage.foldername(name))[1])::uuid, 'organization.manage')
    or exists (
      select 1 from public.ministry_leaders l
      where l.ministry_id = case
        when (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}
  )
);

drop policy if exists report_intake_storage_delete_own on storage.objects;
create policy report_intake_storage_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'report-intake-private'
  and (storage.foldername(name))[3] = (select auth.uid())::text
);

-- The document is only linked to the department's official report register
-- after an authorized reviewer approves it.
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
      updated_at = now()
  where id = p_document_id
  returning * into v_document;

  return v_document;
end;
$$;

grant execute on function public.review_report_intake_document(uuid,text,text) to authenticated;

commit;

        then ((storage.foldername(name))[2])::uuid
        else null
      end
        and l.user_id = (select auth.uid())
        and l.verified = true
    )
  )
);

drop policy if exists report_intake_storage_delete_own on storage.objects;
create policy report_intake_storage_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'report-intake-private'
  and (storage.foldername(name))[3] = (select auth.uid())::text
);

-- The document is only linked to the department's official report register
-- after an authorized reviewer approves it.
create or replace function public.review_report_intake_document(
  p_document_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns public.report_intake_documents
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  v_document public.report_intake_documents;
  v_report_id uuid;
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

  if p_decision = 'APPROVED' and v_document.ministry_id is not null then
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
      updated_at = now()
  where id = p_document_id
  returning * into v_document;

  return v_document;
end;
$$;

grant execute on function public.review_report_intake_document(uuid,text,text) to authenticated;

commit;
