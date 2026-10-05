-- Member contribution submissions and receipt metadata.
alter table public.finance_contributions
  add column if not exists receipt_number text,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_provider text,
  add column if not exists payment_intent_id text;

create unique index if not exists finance_contributions_receipt_number_idx
  on public.finance_contributions(receipt_number) where receipt_number is not null;
create index if not exists finance_contributions_donor_date_idx
  on public.finance_contributions(donor_user_id, occurred_on desc);

-- Members may submit and read only their own contributions. Finance officers retain the existing management policy.
drop policy if exists finance_contributions_member_read on public.finance_contributions;
create policy finance_contributions_member_read on public.finance_contributions
  for select to authenticated
  using (donor_user_id = (select auth.uid()));

drop policy if exists finance_contributions_member_insert on public.finance_contributions;
create policy finance_contributions_member_insert on public.finance_contributions
  for insert to authenticated
  with check (
    donor_user_id = (select auth.uid())
    and created_by = (select auth.uid())
    and status = 'PENDING'
    and payment_method in ('CARD','MOBILE_MONEY','BANK_TRANSFER','CASH')
    and private.is_org_member(organization_id)
  );

-- Receipt identifiers are assigned only by the backend after a confirmed/received record.
create or replace function public.finance_contribution_receipt_number()
returns trigger language plpgsql as $$
begin
  if new.status = 'RECEIVED' and new.receipt_number is null then
    new.receipt_number := 'ZION-' || to_char(coalesce(new.paid_at, now()), 'YYYYMMDD') || '-' || upper(substr(replace(new.id::text, '-', ''), 1, 12));
  end if;
  return new;
end;
$$;
drop trigger if exists trg_finance_contribution_receipt_number on public.finance_contributions;
create trigger trg_finance_contribution_receipt_number
before insert or update of status, paid_at on public.finance_contributions
for each row execute function public.finance_contribution_receipt_number();
