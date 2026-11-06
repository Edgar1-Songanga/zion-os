\set ON_ERROR_STOP on

do $test$
declare
  v_count integer;
  v_distinct integer;
  v_legacy text;
begin
  select verification_code into v_legacy
    from public.giving_receipts
   where id = 1;

  if v_legacy <> 'LEGACY-RECEIPT-CODE' then
    raise exception 'Existing receipt code was modified: %', v_legacy;
  end if;

  insert into public.giving_receipts (verification_code)
  select 'caller-supplied-' || g::text
    from generate_series(1, 1000) as g;

  select count(*), count(distinct verification_code)
    into v_count, v_distinct
    from public.giving_receipts
   where id > 1;

  if v_count <> 1000 or v_distinct <> 1000 then
    raise exception 'Expected 1000 unique codes, got % rows and % unique codes', v_count, v_distinct;
  end if;

  if exists (
    select 1
      from public.giving_receipts
     where id > 1
       and verification_code !~ '^[0-9A-F]{32}$'
  ) then
    raise exception 'A new receipt code is not 32 uppercase hexadecimal characters';
  end if;

  if has_function_privilege('anon', 'private.assign_giving_receipt_verification_code()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.assign_giving_receipt_verification_code()', 'EXECUTE') then
    raise exception 'Untrusted roles can directly execute the private trigger function';
  end if;
end
$test$;

select 'giving receipt verification regression passed' as result;
