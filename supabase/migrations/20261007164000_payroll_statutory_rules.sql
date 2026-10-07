create table if not exists public.payroll_statutory_rules (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 code text not null,
 name text not null,
 jurisdiction text not null default 'AO',
 component_type text not null check(component_type in ('DEDUCTION','EMPLOYER_CONTRIBUTION')),
 calculation_type text not null check(calculation_type in ('FIXED','PERCENTAGE','FORMULA')),
 rate numeric(18,6),
 formula text,
 effective_from date not null,
 effective_to date,
 is_active boolean not null default true,
 metadata jsonb not null default '{}'::jsonb,
 unique(organization_id,code,effective_from)
);
alter table public.payroll_statutory_rules enable row level security;
revoke all on public.payroll_statutory_rules from anon;
grant select,insert,update on public.payroll_statutory_rules to authenticated;
create policy payroll_statutory_rules_access on public.payroll_statutory_rules for all to authenticated
using (private.has_org_permission_in_hierarchy(organization_id,'payroll.read'))
with check (private.has_org_permission_in_hierarchy(organization_id,'payroll.manage'));