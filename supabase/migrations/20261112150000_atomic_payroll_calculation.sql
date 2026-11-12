-- Atomic payroll calculation. The API supplies the validated calculation snapshot;
-- this function locks the run and commits items, lines and totals as one transaction.
create or replace function public.calculate_payroll_run(
  p_organization_id uuid,
  p_run_id uuid,
  p_items jsonb
)
returns table (
  id uuid,
  status text,
  gross_total numeric,
  deduction_total numeric,
  employer_contribution_total numeric,
  net_total numeric
)
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_run public.payroll_runs%rowtype;
  v_item jsonb;
  v_line jsonb;
  v_employee public.hr_employees%rowtype;
  v_item_id uuid;
  v_gross numeric(18,2) := 0;
  v_deductions numeric(18,2) := 0;
  v_employer numeric(18,2) := 0;
  v_net numeric(18,2) := 0;
  v_seen uuid[] := array[]::uuid[];
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not private.has_org_permission_in_hierarchy(p_organization_id, 'payroll.manage') then
    raise exception 'payroll_manage_permission_required' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'payroll_items_must_be_array' using errcode = '22023';
  end if;

  select * into v_run
  from public.payroll_runs
  where payroll_runs.id = p_run_id
    and payroll_runs.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'payroll_run_not_found' using errcode = 'P0002';
  end if;
  if v_run.status <> 'DRAFT' then
    raise exception 'payroll_run_must_be_draft' using errcode = '23514';
  end if;

  -- Defence in depth: unsupported formulas must never become zero-value lines.
  if exists (
    select 1 from public.hr_payroll_components c
    where c.organization_id = p_organization_id
      and c.is_active = true
      and c.calculation_type = 'FORMULA'
  ) then
    raise exception 'unsupported_payroll_formula' using errcode = '22023';
  end if;

  update public.payroll_runs
  set status = 'CALCULATING'
  where payroll_runs.id = p_run_id
    and payroll_runs.organization_id = p_organization_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'employee_id', '') = '' then
      raise exception 'payroll_item_employee_required' using errcode = '22023';
    end if;

    select * into v_employee
    from public.hr_employees e
    where e.id = (v_item->>'employee_id')::uuid
      and e.organization_id = p_organization_id
      and e.employment_status = 'ACTIVE';

    if not found then
      raise exception 'payroll_employee_not_active_or_not_in_organization' using errcode = '23514';
    end if;
    if v_employee.id = any(v_seen) then
      raise exception 'duplicate_employee_in_payroll_payload' using errcode = '23505';
    end if;
    v_seen := array_append(v_seen, v_employee.id);

    if coalesce(v_item->>'currency_code', '') <> v_employee.currency_code then
      raise exception 'payroll_item_currency_mismatch' using errcode = '23514';
    end if;
    if jsonb_typeof(v_item->'lines') is distinct from 'array' then
      raise exception 'payroll_item_lines_must_be_array' using errcode = '22023';
    end if;

    insert into public.payroll_items (
      payroll_run_id, employee_id, gross_amount, deduction_amount,
      employer_contribution_amount, net_amount, currency_code, calculation_snapshot
    ) values (
      p_run_id,
      v_employee.id,
      round((v_item->>'gross_amount')::numeric, 2),
      round((v_item->>'deduction_amount')::numeric, 2),
      round((v_item->>'employer_contribution_amount')::numeric, 2),
      round((v_item->>'net_amount')::numeric, 2),
      v_employee.currency_code,
      coalesce(v_item->'calculation_snapshot', '{}'::jsonb)
    )
    returning payroll_items.id into v_item_id;

    for v_line in select value from jsonb_array_elements(v_item->'lines')
    loop
      if nullif(v_line->>'amount', '')::numeric is null or coalesce(nullif(v_line->>'amount', '')::numeric, 0) < 0 then
        raise exception 'payroll_line_amount_invalid' using errcode = '22023';
      end if;
      if nullif(v_line->>'component_id', '') is not null and not exists (
        select 1 from public.hr_payroll_components c
        where c.id = (v_line->>'component_id')::uuid
          and c.organization_id = p_organization_id
          and c.is_active = true
          and c.component_type = v_line->>'line_type'
      ) then
        raise exception 'payroll_line_component_invalid' using errcode = '23514';
      end if;

      insert into public.payroll_item_lines (
        payroll_item_id, component_id, line_type, description, amount, rate
      ) values (
        v_item_id,
        nullif(v_line->>'component_id', '')::uuid,
        v_line->>'line_type',
        v_line->>'description',
        round((v_line->>'amount')::numeric, 2),
        nullif(v_line->>'rate', '')::numeric
      );
    end loop;

    v_gross := v_gross + round((v_item->>'gross_amount')::numeric, 2);
    v_deductions := v_deductions + round((v_item->>'deduction_amount')::numeric, 2);
    v_employer := v_employer + round((v_item->>'employer_contribution_amount')::numeric, 2);
    v_net := v_net + round((v_item->>'net_amount')::numeric, 2);
  end loop;

  update public.payroll_runs
  set status = 'REVIEW',
      gross_total = v_gross,
      deduction_total = v_deductions,
      employer_contribution_total = v_employer,
      net_total = v_net
  where payroll_runs.id = p_run_id
    and payroll_runs.organization_id = p_organization_id
  returning payroll_runs.id, payroll_runs.status, payroll_runs.gross_total,
    payroll_runs.deduction_total, payroll_runs.employer_contribution_total,
    payroll_runs.net_total
  into id, status, gross_total, deduction_total, employer_contribution_total, net_total;

  return next;
end;
$$;

revoke all on function public.calculate_payroll_run(uuid, uuid, jsonb) from public, anon;
grant execute on function public.calculate_payroll_run(uuid, uuid, jsonb) to authenticated;
