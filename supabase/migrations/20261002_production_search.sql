-- Production search: ranked PostgreSQL full-text search with RLS-aware visibility.
create index if not exists zion_search_documents_fts_idx
  on public.zion_search_documents
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, '')));

create or replace function public.search_zion_documents(
  p_query text,
  p_entity_type text default null,
  p_limit integer default 30
)
returns table (
  id uuid,
  entity_type text,
  entity_id uuid,
  title text,
  body text,
  language text,
  visibility text,
  organization_id uuid,
  updated_at timestamptz,
  rank real
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    d.id, d.entity_type, d.entity_id, d.title, d.body, d.language,
    d.visibility, d.organization_id, d.updated_at,
    ts_rank(
      setweight(to_tsvector('simple', coalesce(d.title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(d.body, '')), 'B'),
      websearch_to_tsquery('simple', trim(p_query))
    ) as rank
  from public.zion_search_documents d
  where trim(p_query) <> ''
    and (
      d.visibility = 'public'
      or d.organization_id is null
      or private.is_org_member(d.organization_id)
    )
    and (p_entity_type is null or d.entity_type = lower(trim(p_entity_type)))
    and (
      setweight(to_tsvector('simple', coalesce(d.title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(d.body, '')), 'B')
    ) @@ websearch_to_tsquery('simple', trim(p_query))
  order by rank desc, d.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

grant execute on function public.search_zion_documents(text, text, integer) to authenticated;
