create table if not exists public.zion_translation_cache (
  id uuid primary key default gen_random_uuid(),
  source_locale text not null,
  target_locale text not null,
  content_type text not null default 'system',
  source_hash text not null,
  source_text text not null,
  translated_text text not null,
  provider text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_locale, target_locale, content_type, source_hash)
);

create index if not exists zion_translation_cache_lookup_idx
  on public.zion_translation_cache(source_locale, target_locale, content_type, source_hash);

alter table public.zion_translation_cache enable row level security;
revoke all on public.zion_translation_cache from anon, authenticated;
drop policy if exists zion_translation_cache_block on public.zion_translation_cache;
create policy zion_translation_cache_block on public.zion_translation_cache
for all to authenticated using (false) with check (false);

create or replace function private.set_zion_translation_cache_updated_at()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_zion_translation_cache_updated_at on public.zion_translation_cache;
create trigger trg_zion_translation_cache_updated_at
before update on public.zion_translation_cache
for each row execute function private.set_zion_translation_cache_updated_at();
