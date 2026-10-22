-- ZION Giving: member contributions, treasury confirmation, and verifiable receipts.
create extension if not exists pgcrypto;

create table if not exists public.finance_giving_funds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  description text,
  fund_type text not null default 'OTHER' check (fund_type in ('TITHE','OFFERING','CONSTRUCTION','MISSIONS','DEPARTMENT','WELFARE','OTHER')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.finance_giving_contributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  fund_id uuid not null references public.finance_giving_funds(id) on delete restrict,
  contributor_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(18,2) not null check (amount > 0),
  currency_code text not null default 'AOA' check (currency_code = 'AOA'),
  payment_method text not null check (payment_method in ('BANK_TRANSFER','MULTICAIXA_EXPRESS')),
  status text not null default 'PENDING' check (status in ('PENDING','UNDER_REVIEW','CONFIRMED','REJECTED')),
  reference_code text not null unique default ('ZGN-' || upper(substr(encode(gen_random_bytes(8),'hex'),1,12))),
  contributor_note text,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status <> 'CONFIRMED') or (confirmed_by is not null and confirmed_at is not null))
);
create index if not exists giving_contribution_member_idx on public.finance_giving_contributions(contributor_id, created_at desc);
create index if not exists giving_contribution_org_idx on public.finance_giving_contributions(organization_id, status, created_at desc);

create table if not exists public.finance_giving_receipts (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null unique references public.finance_giving_contributions(id) on delete restrict,
  receipt_number bigint generated always as identity unique,
  verification_hash text not null unique,
  issued_at timestamptz not null default now()
);

-- Seed a comprehensive, editable list of giving destinations for existing and new organizations.
create or replace function public.seed_default_giving_funds()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $
begin
  insert into public.finance_giving_funds(organization_id,name,description,fund_type,sort_order) values
    (new.id,'Dízimo','Dízimos e fidelidade cristã.','TITHE',10),
    (new.id,'Ofertas gerais','Ofertas regulares para as necessidades da igreja.','OFFERING',20),
    (new.id,'Construção e obras','Construção, reparação e manutenção dos edifícios da igreja.','CONSTRUCTION',30),
    (new.id,'Missões e evangelismo','Evangelismo, missões e expansão da mensagem.','MISSIONS',40),
    (new.id,'Ministério Jovem','Atividades e projetos do Ministério Jovem.','DEPARTMENT',50),
    (new.id,'Ministério Infantil','Programas e recursos para crianças.','DEPARTMENT',60),
    (new.id,'Ministério da Família','Apoio e iniciativas para famílias.','DEPARTMENT',70),
    (new.id,'Ministério da Mulher','Projetos e atividades do Ministério da Mulher.','DEPARTMENT',80),
    (new.id,'Ministério Pessoal','Estudos bíblicos, discipulado e evangelismo pessoal.','DEPARTMENT',90),
    (new.id,'Escola Sabatina','Materiais e projetos da Escola Sabatina.','DEPARTMENT',100),
    (new.id,'Mordomia Cristã','Educação e iniciativas de mordomia cristã.','DEPARTMENT',110),
    (new.id,'Educação','Apoio educativo e projetos escolares.','DEPARTMENT',120),
    (new.id,'Ação social e assistência','Apoio a pessoas e famílias em necessidade.','WELFARE',130),
    (new.id,'Música e culto','Música, louvor e recursos para o culto.','DEPARTMENT',140),
    (new.id,'Comunicação e media','Comunicação, transmissão e meios digitais.','DEPARTMENT',150),
    (new.id,'Projetos da igreja local','Projetos aprovados pela igreja local.','OTHER',160),
    (new.id,'Projetos da Missão/Associação','Projetos da estrutura eclesiástica regional.','OTHER',170),
    (new.id,'Outro destino aprovado','Contribuição destinada a uma finalidade aprovada pela tesouraria.','OTHER',180)
  on conflict (organization_id,name) do nothing;
  return new;
end $$;

drop trigger if exists organizations_seed_giving_funds on public.organizations;
create trigger organizations_seed_giving_funds after insert on public.organizations
for each row execute function public.seed_default_giving_funds();
revoke all on function public.seed_default_giving_funds() from public, anon, authenticated;

insert into public.finance_giving_funds(organization_id,name,description,fund_type,sort_order)
select o.id, f.name, f.description, f.fund_type, f.sort_order
from public.organizations o
cross join (values
 ('Dízimo','Dízimos e fidelidade cristã.','TITHE',10),
 ('Ofertas gerais','Ofertas regulares para as necessidades da igreja.','OFFERING',20),
 ('Construção e obras','Construção, reparação e manutenção dos edifícios da igreja.','CONSTRUCTION',30),
 ('Missões e evangelismo','Evangelismo, missões e expansão da mensagem.','MISSIONS',40),
 ('Ministério Jovem','Atividades e projetos do Ministério Jovem.','DEPARTMENT',50),
 ('Ministério Infantil','Programas e recursos para crianças.','DEPARTMENT',60),
 ('Ministério da Família','Apoio e iniciativas para famílias.','DEPARTMENT',70),
 ('Ministério da Mulher','Projetos e atividades do Ministério da Mulher.','DEPARTMENT',80),
 ('Ministério Pessoal','Estudos bíblicos, discipulado e evangelismo pessoal.','DEPARTMENT',90),
 ('Escola Sabatina','Materiais e projetos da Escola Sabatina.','DEPARTMENT',100),
 ('Mordomia Cristã','Educação e iniciativas de mordomia cristã.','DEPARTMENT',110),
 ('Educação','Apoio educativo e projetos escolares.','DEPARTMENT',120),
 ('Ação social e assistência','Apoio a pessoas e famílias em necessidade.','WELFARE',130),
 ('Música e culto','Música, louvor e recursos para o culto.','DEPARTMENT',140),
 ('Comunicação e media','Comunicação, transmissão e meios digitais.','DEPARTMENT',150),
 ('Projetos da igreja local','Projetos aprovados pela igreja local.','OTHER',160),
 ('Projetos da Missão/Associação','Projetos da estrutura eclesiástica regional.','OTHER',170),
 ('Outro destino aprovado','Contribuição destinada a uma finalidade aprovada pela tesouraria.','OTHER',180)
) as f(name,description,fund_type,sort_order)
on conflict (organization_id,name) do nothing;

alter table public.finance_giving_funds enable row level security;
alter table public.finance_giving_contributions enable row level security;
alter table public.finance_giving_receipts enable row level security;
revoke all on public.finance_giving_funds, public.finance_giving_contributions, public.finance_giving_receipts from anon;
grant select on public.finance_giving_funds to authenticated;
grant select, insert, update on public.finance_giving_contributions to authenticated;
grant select on public.finance_giving_receipts to authenticated;

drop policy if exists giving_funds_read on public.finance_giving_funds;
create policy giving_funds_read on public.finance_giving_funds for select to authenticated using (is_active);
drop policy if exists giving_contribution_read on public.finance_giving_contributions;
create policy giving_contribution_read on public.finance_giving_contributions for select to authenticated
using (contributor_id=(select auth.uid()) or private.has_org_permission(organization_id,'finance.read'));
drop policy if exists giving_contribution_insert on public.finance_giving_contributions;
create policy giving_contribution_insert on public.finance_giving_contributions for insert to authenticated
with check (contributor_id=(select auth.uid()) and status='PENDING' and confirmed_by is null and confirmed_at is null
  and exists(select 1 from public.finance_giving_funds f where f.id=fund_id and f.organization_id=finance_giving_contributions.organization_id and f.is_active));
drop policy if exists giving_contribution_manage on public.finance_giving_contributions;
create policy giving_contribution_manage on public.finance_giving_contributions for update to authenticated
using (private.has_org_permission(organization_id,'finance.manage'))
with check (private.has_org_permission(organization_id,'finance.manage'));
drop policy if exists giving_receipt_read on public.finance_giving_receipts;
create policy giving_receipt_read on public.finance_giving_receipts for select to authenticated
using (exists(select 1 from public.finance_giving_contributions c where c.id=contribution_id and (c.contributor_id=(select auth.uid()) or private.has_org_permission(c.organization_id,'finance.read'))));

create or replace function public.issue_giving_receipt_after_confirmation()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $
begin
  new.updated_at := now();
  if new.status='CONFIRMED' and old.status is distinct from 'CONFIRMED' then
    if new.confirmed_by is null then raise exception 'giving_confirmation_actor_required'; end if;
    new.confirmed_at := coalesce(new.confirmed_at,now());
    insert into public.finance_giving_receipts(contribution_id,verification_hash)
    values(new.id,encode(digest(new.id::text || ':' || new.reference_code || ':' || new.amount::text || ':' || new.confirmed_at::text,'sha256'),'hex'))
    on conflict(contribution_id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists giving_receipt_on_confirmation on public.finance_giving_contributions;
create trigger giving_receipt_on_confirmation before update of status on public.finance_giving_contributions
for each row execute function public.issue_giving_receipt_after_confirmation();
revoke all on function public.issue_giving_receipt_after_confirmation() from public, anon, authenticated;


-- Automatically post confirmed giving to the existing double-entry ledger.
create unique index if not exists finance_journal_giving_source_unique
on public.finance_journal_entries(organization_id,source_type,source_id)
where source_type='GIVING' and source_id is not null;

create or replace function private.post_confirmed_giving_to_ledger()
returns trigger language plpgsql security definer set search_path=public,private,pg_temp as $$
declare
  v_fund public.finance_giving_funds%rowtype;
  v_cash_account uuid;
  v_fund_account uuid;
  v_entry uuid;
begin
  if new.status='CONFIRMED' and old.status is distinct from 'CONFIRMED' then
    select * into v_fund from public.finance_giving_funds where id=new.fund_id and organization_id=new.organization_id;
    if not found then raise exception 'giving_fund_not_found'; end if;

    insert into public.finance_accounts(organization_id,code,name,account_type,currency_code)
    values(new.organization_id,'GIV-CASH','Recebimentos de contribuições','ASSET','AOA')
    on conflict(organization_id,code) do nothing;
    select id into v_cash_account from public.finance_accounts where organization_id=new.organization_id and code='GIV-CASH';

    insert into public.finance_accounts(organization_id,code,name,account_type,currency_code)
    values(new.organization_id,'GIV-' || upper(substr(replace(v_fund.id::text,'-',''),1,8)),'Contribuições · ' || v_fund.name,'REVENUE','AOA')
    on conflict(organization_id,code) do nothing;
    select id into v_fund_account from public.finance_accounts where organization_id=new.organization_id and code='GIV-' || upper(substr(replace(v_fund.id::text,'-',''),1,8));

    insert into public.finance_journal_entries(organization_id,entry_date,description,source_type,source_id,status,created_by)
    values(new.organization_id,current_date,'Contribuição confirmada · ' || v_fund.name || ' · ' || new.reference_code,'GIVING',new.id,'POSTED',new.confirmed_by)
    on conflict (organization_id,source_type,source_id) where source_type='GIVING' and source_id is not null do nothing
    returning id into v_entry;

    if v_entry is not null then
      insert into public.finance_journal_lines(journal_entry_id,account_id,debit,credit,description)
      values
        (v_entry,v_cash_account,new.amount,0,'Recebimento · ' || new.reference_code),
        (v_entry,v_fund_account,0,new.amount,'Destino: ' || v_fund.name);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists giving_post_to_ledger on public.finance_giving_contributions;
create trigger giving_post_to_ledger after update of status on public.finance_giving_contributions
for each row execute function private.post_confirmed_giving_to_ledger();
