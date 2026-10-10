-- Atomic finance write path. No journal can be left half-written if a line
-- insert fails; the server-side permission check remains authoritative.
create or replace function public.create_finance_manual_journal_entry(
  p_organization_id uuid,
  p_description text,
  p_entry_date date,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid := auth.uid();
  line_count integer;
  unique_account_count integer;
  matched_account_count integer;
  currency_count integer;
  debit_total numeric(18,2);
  credit_total numeric(18,2);
  entry_id uuid;
  entry_number bigint;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if p_organization_id is null
     or not private.has_org_permission(p_organization_id, 'finance.manage') then
    raise exception using errcode = '42501', message = 'finance_manage_permission_required';
  end if;
  if p_description is null or length(trim(p_description)) < 2 or length(trim(p_description)) > 500 then
    raise exception using errcode = '22023', message = 'invalid_journal_description';
  end if;
  if p_entry_date is null then
    raise exception using errcode = '22023', message = 'journal_date_required';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception using errcode = '22023', message = 'journal_lines_must_be_an_array';
  end if;

  line_count := jsonb_array_length(p_lines);
  if line_count < 2 or line_count > 200 then
    raise exception using errcode = '22023', message = 'journal_line_count_out_of_range';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_lines) as line(account_id uuid, debit numeric, credit numeric, description text)
    where line.account_id is null
       or line.debit is null
       or line.credit is null
       or line.debit < 0
       or line.credit < 0
       or line.debit <> round(line.debit, 2)
       or line.credit <> round(line.credit, 2)
       or not ((line.debit > 0 and line.credit = 0) or (line.credit > 0 and line.debit = 0))
  ) then
    raise exception using errcode = '22023', message = 'invalid_journal_line';
  end if;

  select count(distinct line.account_id)::integer,
         coalesce(sum(line.debit), 0),
         coalesce(sum(line.credit), 0)
  into unique_account_count, debit_total, credit_total
  from jsonb_to_recordset(p_lines) as line(account_id uuid, debit numeric, credit numeric, description text);

  if debit_total <> credit_total then
    raise exception using errcode = '22023', message = 'finance_journal_entry_not_balanced';
  end if;

  select count(distinct line.account_id)::integer,
         count(distinct account.id)::integer,
         count(distinct account.currency_code)::integer
  into unique_account_count, matched_account_count, currency_count
  from jsonb_to_recordset(p_lines) as line(account_id uuid, debit numeric, credit numeric, description text)
  left join public.finance_accounts account
    on account.id = line.account_id
   and account.organization_id = p_organization_id
   and account.is_active = true;

  if unique_account_count <> matched_account_count then
    raise exception using errcode = '22023', message = 'journal_account_missing_or_inactive';
  end if;
  if currency_count <> 1 then
    raise exception using errcode = '22023', message = 'journal_currency_mismatch';
  end if;

  insert into public.finance_journal_entries (
    organization_id, entry_date, description, source_type, status, created_by
  ) values (
    p_organization_id, p_entry_date, trim(p_description), 'MANUAL', 'DRAFT', actor_id
  ) returning id, finance_journal_entries.entry_number
  into entry_id, entry_number;

  insert into public.finance_journal_lines (
    journal_entry_id, account_id, debit, credit, description
  )
  select entry_id, line.account_id, line.debit, line.credit, nullif(trim(line.description), '')
  from jsonb_to_recordset(p_lines) as line(account_id uuid, debit numeric, credit numeric, description text);

  update public.finance_journal_entries
  set status = 'POSTED'
  where id = entry_id and organization_id = p_organization_id;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, resource_type, resource_id, metadata
  ) values (
    p_organization_id,
    actor_id,
    'finance.journal.posted',
    'finance_journal_entry',
    entry_id,
    jsonb_build_object('entry_number', entry_number, 'line_count', line_count, 'currency_count', currency_count)
  );

  return jsonb_build_object(
    'id', entry_id,
    'entry_number', entry_number,
    'entry_date', p_entry_date,
    'description', trim(p_description),
    'status', 'POSTED'
  );
end;
$$;

revoke all on function public.create_finance_manual_journal_entry(uuid, text, date, jsonb) from public, anon;
grant execute on function public.create_finance_manual_journal_entry(uuid, text, date, jsonb) to authenticated;
