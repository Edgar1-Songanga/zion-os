insert into public.finance_journal_entries(id,status)
values ('00000000-0000-0000-0000-000000000001','DRAFT'),
       ('00000000-0000-0000-0000-000000000002','DRAFT');

insert into public.finance_journal_lines(id,journal_entry_id,account_id,debit,credit)
values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',100,0);

update public.finance_journal_lines
set debit=125
where id='10000000-0000-0000-0000-000000000001';

update public.finance_journal_entries
set status='POSTED'
where id='00000000-0000-0000-0000-000000000001';

do $$
declare
  blocked boolean;
begin
  blocked := false;
  begin
    update public.finance_journal_entries set description='rewritten'
    where id='00000000-0000-0000-0000-000000000001';
  exception when sqlstate '55000' then blocked := true;
  end;
  if not blocked then raise exception 'posted journal header UPDATE was not blocked'; end if;

  blocked := false;
  begin
    delete from public.finance_journal_entries
    where id='00000000-0000-0000-0000-000000000001';
  exception when sqlstate '55000' then blocked := true;
  end;
  if not blocked then raise exception 'posted journal header DELETE was not blocked'; end if;

  blocked := false;
  begin
    update public.finance_journal_lines set debit=1
    where id='10000000-0000-0000-0000-000000000001';
  exception when sqlstate '55000' then blocked := true;
  end;
  if not blocked then raise exception 'posted line UPDATE was not blocked'; end if;

  blocked := false;
  begin
    delete from public.finance_journal_lines
    where id='10000000-0000-0000-0000-000000000001';
  exception when sqlstate '55000' then blocked := true;
  end;
  if not blocked then raise exception 'posted line DELETE was not blocked'; end if;

  blocked := false;
  begin
    insert into public.finance_journal_lines(id,journal_entry_id,account_id,debit,credit)
    values ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',0,125);
  exception when sqlstate '55000' then blocked := true;
  end;
  if not blocked then raise exception 'posted line INSERT was not blocked'; end if;

  blocked := false;
  begin
    update public.finance_journal_lines
    set journal_entry_id='00000000-0000-0000-0000-000000000002'
    where id='10000000-0000-0000-0000-000000000001';
  exception when sqlstate '55000' then blocked := true;
  end;
  if not blocked then raise exception 'journal line reassignment was not blocked'; end if;

  if has_table_privilege('authenticated','public.finance_journal_entries','INSERT')
     or has_table_privilege('authenticated','public.finance_journal_entries','UPDATE')
     or has_table_privilege('authenticated','public.finance_journal_entries','DELETE') then
    raise exception 'authenticated role retains direct journal-header write privileges';
  end if;
  if not has_table_privilege('authenticated','public.finance_journal_entries','SELECT') then
    raise exception 'authenticated role lost journal-header read privilege';
  end if;

  if has_table_privilege('authenticated','public.finance_journal_lines','INSERT')
     or has_table_privilege('authenticated','public.finance_journal_lines','UPDATE')
     or has_table_privilege('authenticated','public.finance_journal_lines','DELETE') then
    raise exception 'authenticated role retains direct journal-line write privileges';
  end if;
  if not has_table_privilege('authenticated','public.finance_journal_lines','SELECT') then
    raise exception 'authenticated role lost journal-line read privilege';
  end if;
end;
$$;
