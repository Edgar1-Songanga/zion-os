-- Harden the production search RPC against anonymous execution and
-- accidental exposure of non-public, organization-less documents.
-- The API already authenticates callers before invoking this RPC.

revoke execute on function public.search_zion_documents(text, text, integer) from anon;
grant execute on function public.search_zion_documents(text, text, integer) to authenticated;

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
      or (
        d.visibility <> 'public'
        and d.organization_id is not null
        and private.is_org_member(d.organization_id)
      )
    )
    and (p_entity_type is null or d.entity_type = lower(trim(p_entity_type)))
    and (
      setweight(to_tsvector('simple', coalesce(d.title, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(d.body, '')), 'B')
    ) @@ websearch_to_tsquery('simple', trim(p_query))
  order by rank desc, d.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;
