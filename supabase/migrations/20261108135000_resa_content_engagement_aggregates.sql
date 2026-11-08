begin;

-- Return counts only (never the identities of people who reacted/shared).
-- The requested publications are filtered through the viewer's actual content
-- audience and block relationship before aggregates are calculated.
create or replace function private.resa_content_engagement_counts(p_content_ids uuid[])
returns table (
  content_id uuid,
  reaction_count bigint,
  comment_count bigint,
  share_count bigint
)
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $function$
  select
    c.id,
    (select count(*) from public.resa_reactions r where r.content_id = c.id)::bigint,
    (select count(*) from public.resa_comments cm where cm.content_id = c.id and cm.status = 'active')::bigint,
    (select count(*) from public.resa_shares s where s.content_id = c.id)::bigint
  from public.resa_contents c
  where auth.uid() is not null
    and p_content_ids is not null
    and cardinality(p_content_ids) between 1 and 200
    and c.id = any(p_content_ids)
    and private.resa_can_view_content(c.author_id, c.visibility, c.community_id, c.organization_id)
    and not private.resa_is_blocked_by_or_blocking(c.author_id);
$function$;
revoke all on function private.resa_content_engagement_counts(uuid[]) from public, anon;
grant execute on function private.resa_content_engagement_counts(uuid[]) to authenticated;

create or replace function public.resa_content_engagement_counts(p_content_ids uuid[])
returns table (
  content_id uuid,
  reaction_count bigint,
  comment_count bigint,
  share_count bigint
)
language sql
stable
security invoker
set search_path = pg_catalog, pg_temp
as $function$
  select * from private.resa_content_engagement_counts(p_content_ids);
$function$;
revoke all on function public.resa_content_engagement_counts(uuid[]) from public, anon;
grant execute on function public.resa_content_engagement_counts(uuid[]) to authenticated;

commit;
