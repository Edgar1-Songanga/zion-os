-- Strengthen verification codes on newly issued Giving receipts.
-- Existing codes remain valid so previously delivered receipts are not invalidated.
-- 16 random bytes provide 128 bits of entropy; the UNIQUE constraint remains the
-- final collision guard. No personal donor data is added to public verification.

create or replace function private.giving_confirm_core(
  p_payment_id uuid,
  p_actor uuid,
  p_provider_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v public.giving_payments%rowtype;
  v_fund public.giving_funds%rowtype;
  v_method public.giving_payment_methods%rowtype;
  v_org_name text;
  v_donor text;
  v_entry uuid;
  v_seq integer;
  v_year integer := extract(year from now())::integer;
  v_number text;
  v_code text;
  v_issued timestamptz := now();
  v_hash text;
  v_receipt_id uuid;
  v_asset_cur text;
  v_rev_cur text;
begin
  select * into v from public.giving_payments where id = p_payment_id for update;
  if not found then
    raise exception using errcode = '22023', message = 'payment_not_found';
  end if;

  if v.status = 'CONFIRMED' then
    return private.giving_payment_json(v.id) || jsonb_build_object('already_confirmed', true);
  end if;
  if v.status not in ('PENDING', 'AWAITING_CONFIRMATION') then
    raise exception using errcode = '22023', message = 'payment_not_confirmable';
  end if;

  select * into v_fund from public.giving_funds where id = v.fund_id;
  select * into v_method from public.giving_payment_methods where id = v.method_id;

  if v_fund.revenue_account_id is not null and v_method.asset_account_id is not null then
    select currency_code into v_rev_cur
      from public.finance_accounts
     where id = v_fund.revenue_account_id
       and organization_id = v.organization_id
       and is_active;
    select currency_code into v_asset_cur
      from public.finance_accounts
     where id = v_method.asset_account_id
       and organization_id = v.organization_id
       and is_active;

    if v_rev_cur is null or v_asset_cur is null then
      raise exception using errcode = '22023', message = 'giving_ledger_account_missing_or_inactive';
    end if;
    if v_rev_cur <> v.currency_code or v_asset_cur <> v.currency_code then
      raise exception using errcode = '22023', message = 'giving_ledger_currency_mismatch';
    end if;

    insert into public.finance_journal_entries
      (organization_id, entry_date, description, source_type, status, created_by)
    values
      (v.organization_id, current_date,
       left('Contribuição ' || v_fund.name || ' ' || v.reference, 500),
       'GIVING', 'DRAFT', p_actor)
    returning id into v_entry;

    insert into public.finance_journal_lines
      (journal_entry_id, account_id, debit, credit, description)
    values
      (v_entry, v_method.asset_account_id, v.amount, 0, 'Recebimento ' || v.reference),
      (v_entry, v_fund.revenue_account_id, 0, v.amount, v_fund.name);

    update public.finance_journal_entries set status = 'POSTED' where id = v_entry;
  end if;

  update public.giving_payments
     set status = 'CONFIRMED',
         confirmed_at = now(),
         confirmed_by = p_actor,
         provider_reference = coalesce(p_provider_reference, provider_reference),
         journal_entry_id = v_entry,
         updated_at = now()
   where id = v.id;

  select name into v_org_name from public.organizations where id = v.organization_id;
  select coalesce(
    nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
    display_name,
    'Membro'
  )
    into v_donor
    from public.profiles
   where id = v.donor_user_id;

  insert into public.giving_receipt_counters as c
    (organization_id, receipt_year, last_seq)
  values
    (v.organization_id, v_year, 1)
  on conflict (organization_id, receipt_year)
  do update set last_seq = c.last_seq + 1
  returning last_seq into v_seq;

  v_number := 'R' || v_year::text || '-' || lpad(v_seq::text, 6, '0');
  v_code := upper(encode(extensions.gen_random_bytes(16), 'hex'));
  v_hash := encode(sha256(convert_to(
    v_number || '|' || v.organization_id::text || '|' || v.id::text || '|' ||
    v.amount::text || '|' || v.currency_code || '|' ||
    to_char(v_issued at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' ||
    v.donor_user_id::text || '|' || v.reference,
    'UTF8'
  )), 'hex');

  insert into public.giving_receipts
    (organization_id, payment_id, donor_user_id, receipt_year, receipt_seq,
     receipt_number, issued_at, issuer_name, donor_name, fund_name,
     method_label, payment_reference, amount, currency_code, content_hash,
     verification_code)
  values
    (v.organization_id, v.id, v.donor_user_id, v_year, v_seq, v_number,
     v_issued, v_org_name, v_donor, v_fund.name, v_method.label,
     v.reference, v.amount, v.currency_code, v_hash, v_code)
  returning id into v_receipt_id;

  insert into public.audit_logs
    (organization_id, actor_user_id, action, resource_type, resource_id, metadata)
  values
    (v.organization_id, p_actor, 'giving.payment.confirmed',
     'giving_payment', v.id,
     jsonb_build_object(
       'receipt_number', v_number,
       'journal_posted', v_entry is not null,
       'via', case when p_actor is null then 'provider' else 'treasurer' end
     ));

  return private.giving_payment_json(v.id);
end
$function$;

comment on function private.giving_confirm_core(uuid, uuid, text) is
  'Confirms a Giving payment, posts its balanced ledger entry, and issues an immutable receipt with a 128-bit random verification code for new receipts.';
