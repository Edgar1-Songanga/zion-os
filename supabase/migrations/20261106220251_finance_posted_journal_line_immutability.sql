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

-- Posted journal headers are also immutable. The atomic posting RPC is the
-- only authenticated write path; it creates a DRAFT header and transitions it
-- to POSTED only after inserting and validating balanced lines.
revoke insert, update, delete
  on table public.finance_journal_entries
  from authenticated;

create or replace function private.guard_finance_journal_entry_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if old.status = 'POSTED' then
    raise exception using
      errcode = '55000',
      message = 'posted_finance_journal_entries_are_immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_finance_journal_entry_mutation() from public, anon, authenticated;

drop trigger if exists finance_journal_entry_immutability on public.finance_journal_entries;
create trigger finance_journal_entry_immutability
before update or delete on public.finance_journal_entries
for each row execute function private.guard_finance_journal_entry_mutation();

-- Preserve read access for finance screens; all writes use the atomic posting RPC.
grant select on public.finance_journal_entries, public.finance_journal_lines to authenticated;
