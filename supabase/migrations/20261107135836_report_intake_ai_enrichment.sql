begin;

alter table public.report_intake_documents
  add column if not exists classification_reason text,
  add column if not exists extracted_fields jsonb not null default '{}'::jsonb,
  add column if not exists document_date date,
  add column if not exists report_type text;

alter table public.report_intake_documents
  drop constraint if exists report_intake_extracted_fields_object;
alter table public.report_intake_documents
  add constraint report_intake_extracted_fields_object
  check (jsonb_typeof(extracted_fields) = 'object');

alter table public.report_intake_documents
  drop constraint if exists report_intake_classification_reason_length;
alter table public.report_intake_documents
  add constraint report_intake_classification_reason_length
  check (classification_reason is null or length(classification_reason) <= 1000);

alter table public.report_intake_documents
  drop constraint if exists report_intake_report_type_length;
alter table public.report_intake_documents
  add constraint report_intake_report_type_length
  check (report_type is null or length(report_type) <= 100);

commit;
