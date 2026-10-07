-- Normalize the canonical Angola Portuguese locale and keep profile preferences
-- aligned with the frontend locale registry.
update public.profiles
set locale = 'pt-AO', updated_at = now()
where locale = 'pt';

alter table public.profiles
  alter column locale set default 'pt-AO';
