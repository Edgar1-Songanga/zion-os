-- Enterprise payment runtime. Provider webhooks are the only source of truth for RECEIVED.
alter table public.finance_contributions
  add column if not exists idempotency_key text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_status text,
  add column if not exists checkout_url text;

alter table public.finance_contributions drop constraint if exists finance_contributions_status_check;
alter table public.finance_contributions add constraint finance_contributions_status_check check (status in ('PENDING','RECEIVED','FAILED','REFUNDED','CANCELLED'));

create unique index if not exists finance_contributions_org_donor_idempotency_idx
  on public.finance_contributions(organization_id, donor_user_id, idempotency_key)
  where idempotency_key is not null;
create unique index if not exists finance_contributions_provider_checkout_idx
  on public.finance_contributions(provider_checkout_id)
  where provider_checkout_id is not null;

create table if not exists public.finance_payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  contribution_id uuid references public.finance_contributions(id) on delete set null,
  payload_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);
create index if not exists finance_payment_events_contribution_idx on public.finance_payment_events(contribution_id, created_at desc);
alter table public.finance_payment_events enable row level security;

drop policy if exists finance_payment_events_finance_read on public.finance_payment_events;
create policy finance_payment_events_finance_read on public.finance_payment_events
  for select to authenticated
  using (contribution_id is not null and exists (select 1 from public.finance_contributions contribution where contribution.id = contribution_id and private.has_org_permission(contribution.organization_id, 'finance.manage')));

-- Only the service-role webhook worker inserts payment events; no client policy is provided.
