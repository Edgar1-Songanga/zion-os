-- Remove non-DML table privileges from authenticated clients on finance/payroll tables.
-- Existing row access remains governed by the current RLS policies.
-- service_role and existing SELECT/INSERT/UPDATE/DELETE grants are unchanged.

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE
    public.finance_accounts,
    public.finance_journal_entries,
    public.finance_journal_lines,
    public.payroll_runs,
    public.payroll_items,
    public.payroll_item_lines,
    public.payroll_statutory_rules
  FROM authenticated;
