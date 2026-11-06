-- Protect the accounting ledger from direct edits after a journal is posted.
-- Posted entries are corrected through reversing entries, never by rewriting history.
-- Authenticated clients read journal lines; writes are restricted to the atomic
-- SECURITY DEFINER posting function, which inserts lines while the parent is DRAFT.

revoke insert, update, delete
  on table public.finance_journal_lines
  from authenticated;

create or replace function private.guard_finance_journal_line_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  parent_status text;
begin
  if tg_op = 'INSERT' then
    select status into parent_status
    from public.finance_journal_entries
    where id = new.journal_entry_id;

    if parent_status is distinct from 'DRAFT' then
      raise exception using
        errcode = '55000',
        message = 'posted_finance_journal_lines_are_immutable';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.journal_entry_id is distinct from old.journal_entry_id then
      raise exception using
        errcode = '55000',
        message = 'finance_journal_line_cannot_move_between_entries';
    end if;

    select status into parent_status
    from public.finance_journal_entries
    where id = old.journal_entry_id;

    if parent_status is distinct from 'DRAFT' then
      raise exception using
        errcode = '55000',
        message = 'posted_finance_journal_lines_are_immutable';
    end if;
    return new;
  end if;

  select status into parent_status
  from public.finance_journal_entries
  where id = old.journal_entry_id;

  if parent_status is distinct from 'DRAFT' then
    raise exception using
      errcode = '55000',
      message = 'posted_finance_journal_lines_are_immutable';
  end if;
  return old;
end;
$$;

revoke all on function private.guard_finance_journal_line_mutation() from public, anon, authenticated;

drop trigger if exists finance_journal_line_immutability on public.finance_journal_lines;
create trigger finance_journal_line_immutability
before insert or update or delete on public.finance_journal_lines
for each row execute function private.guard_finance_journal_line_mutation();

-- Preserve read access for the finance UI; writes must use the atomic posting RPC.
grant select on public.finance_journal_lines to authenticated;
