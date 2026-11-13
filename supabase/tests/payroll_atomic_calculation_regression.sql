-- Run only against the disposable payroll fixture in the CI workflow.
insert into public.payroll_runs (id, organization_id, period_start, period_end, status, currency_code)
values ('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000010',
        '2026-10-01','2026-10-31','DRAFT','AOA');
insert into public.hr_employees (id, organization_id, employee_number, employment_status, currency_code) values
('90000000-0000-4000-8000-000000000101','90000000-0000-4000-8000-000000000010','EMP-001','ACTIVE','AOA'),
('90000000-0000-4000-8000-000000000102','90000000-0000-4000-8000-000000000010','EMP-002','ACTIVE','AOA'),
('90000000-0000-4000-8000-000000000103','90000000-0000-4000-8000-000000000010','VOL-001','ACTIVE','AOA');
insert into public.hr_contracts (id, employee_id, status, start_date, end_date, currency_code, base_salary) values
('90000000-0000-4000-8000-000000000201','90000000-0000-4000-8000-000000000101','ACTIVE','2026-01-01',null,'AOA',100000),
('90000000-0000-4000-8000-000000000202','90000000-0000-4000-8000-000000000102','ACTIVE','2026-01-01',null,'AOA',80000);

set role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000999',false);

do $payroll_regression$
declare
  v_payload jsonb := jsonb_build_array(jsonb_build_object(
    'employee_id','90000000-0000-4000-8000-000000000101',
    'gross_amount',100000,'deduction_amount',0,'employer_contribution_amount',0,
    'net_amount',100000,'currency_code','AOA',
    'lines',jsonb_build_array(jsonb_build_object(
      'component_id',null,'line_type','EARNING','description','Base salary','amount',100000,'rate',null
    ))
  ));
  v_status text;
  v_count integer;
begin
  -- A caller cannot silently omit a contracted active employee.
  begin
    perform * from public.calculate_payroll_run(
      '90000000-0000-4000-8000-000000000010',
      '90000000-0000-4000-8000-000000000001', v_payload
    );
    raise exception 'Expected incomplete payroll payload to be rejected';
  exception when sqlstate '23514' then
    if sqlerrm not like '%payroll_payload_missing_eligible_employees%' then raise; end if;
  end;

  select status into v_status from public.payroll_runs
  where id = '90000000-0000-4000-8000-000000000001';
  select count(*) into v_count from public.payroll_items
  where payroll_run_id = '90000000-0000-4000-8000-000000000001';
  if v_status <> 'DRAFT' or v_count <> 0 then
    raise exception 'Incomplete payroll attempt was not rolled back';
  end if;

  -- Active personnel without a contract are deliberately excluded (e.g. volunteers).
  v_payload := v_payload || jsonb_build_array(jsonb_build_object(
    'employee_id','90000000-0000-4000-8000-000000000102',
    'gross_amount',80000,'deduction_amount',0,'employer_contribution_amount',0,
    'net_amount',80000,'currency_code','AOA',
    'lines',jsonb_build_array(jsonb_build_object(
      'component_id',null,'line_type','EARNING','description','Base salary','amount',80000,'rate',null
    ))
  ));

  perform * from public.calculate_payroll_run(
    '90000000-0000-4000-8000-000000000010',
    '90000000-0000-4000-8000-000000000001', v_payload
  );

  select status into v_status from public.payroll_runs
  where id = '90000000-0000-4000-8000-000000000001';
  select count(*) into v_count from public.payroll_items
  where payroll_run_id = '90000000-0000-4000-8000-000000000001';
  if v_status <> 'REVIEW' or v_count <> 2 then
    raise exception 'Complete payroll was not atomically finalized';
  end if;
end
$payroll_regression$;
reset role;
