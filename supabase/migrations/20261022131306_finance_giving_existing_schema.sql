-- ZION Giving: extend the existing giving_funds/giving_payments ledger.
-- Do not create parallel finance_giving_* tables: the production schema already
-- contains audited payment, receipt, RLS and ledger-confirmation RPCs.

create or replace function private.seed_giving_defaults(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_cash_account uuid;
  v_revenue_account uuid;
  r record;
begin
  if p_organization_id is null then return; end if;

  insert into public.finance_accounts(organization_id, code, name, account_type, currency_code)
  values (p_organization_id, 'GIV_CASH', 'Recebimentos de contribuições', 'ASSET', 'AOA')
  on conflict (organization_id, code) do nothing;
  select id into v_cash_account from public.finance_accounts
   where organization_id = p_organization_id and code = 'GIV_CASH';

  for r in
    select * from (values
      ('TITHE','Dízimo','TITHE'),
      ('OFFERING','Ofertas gerais','OFFERING'),
      ('BUILDING','Construção e obras','BUILDING'),
      ('MISSIONS','Missões e evangelismo','MISSIONS'),
      ('YOUTH','Ministério Jovem','OTHER'),
      ('CHILDREN','Ministério Infantil','OTHER'),
      ('FAMILY','Ministério da Família','OTHER'),
      ('WOMEN','Ministério da Mulher','OTHER'),
      ('PERSONAL_MINISTRY','Ministério Pessoal','OTHER'),
      ('SABBATH_SCHOOL','Escola Sabatina','OTHER'),
      ('STEWARDSHIP','Mordomia Cristã','OTHER'),
      ('EDUCATION','Educação','OTHER'),
      ('WELFARE','Ação social e assistência','OTHER'),
      ('WORSHIP','Música e culto','OTHER'),
      ('COMMUNICATIONS','Comunicação e media','OTHER'),
      ('LOCAL_PROJECTS','Projetos da igreja local','OTHER'),
      ('REGIONAL_PROJECTS','Projetos da Missão/Associação','OTHER'),
      ('OTHER','Outro destino aprovado','OTHER')
    ) as x(code, name, kind)
  loop
    insert into public.finance_accounts(organization_id, code, name, account_type, currency_code)
    values (p_organization_id, 'GIV_' || r.code, 'Contribuições · ' || r.name, 'REVENUE', 'AOA')
    on conflict (organization_id, code) do nothing;
    select id into v_revenue_account from public.finance_accounts
     where organization_id = p_organization_id and code = 'GIV_' || r.code;

    insert into public.giving_funds(organization_id, code, name, kind, revenue_account_id, is_active)
    values (p_organization_id, r.code, r.name, r.kind, v_revenue_account, true)
    on conflict (organization_id, code) do nothing;
  end loop;

  -- Keep bank transfer disabled until an authorized treasurer enters real
  -- bank details. Never seed fictitious IBAN/account-holder information.
  insert into public.giving_payment_methods
    (organization_id, provider, label, is_enabled, currency_code, public_details, asset_account_id, min_amount, max_amount)
  select p_organization_id, 'BANK_TRANSFER', 'Transferência bancária', false, 'AOA',
         jsonb_build_object('message', 'A tesouraria deve configurar os dados bancários oficiais.'),
         v_cash_account, 100, 100000000
  where not exists (
    select 1 from public.giving_payment_methods
     where organization_id = p_organization_id and provider = 'BANK_TRANSFER'
  );
end;
$$;

revoke all on function private.seed_giving_defaults(uuid) from public, anon, authenticated;

create or replace function public.seed_giving_defaults_after_organization_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  perform private.seed_giving_defaults(new.id);
  return new;
end;
$$;

revoke all on function public.seed_giving_defaults_after_organization_insert() from public, anon, authenticated;
drop trigger if exists organizations_seed_giving_defaults on public.organizations;
create trigger organizations_seed_giving_defaults
after insert on public.organizations
for each row execute function public.seed_giving_defaults_after_organization_insert();

do $$
declare r record;
begin
  for r in select id from public.organizations loop
    perform private.seed_giving_defaults(r.id);
  end loop;
end;
$$;
