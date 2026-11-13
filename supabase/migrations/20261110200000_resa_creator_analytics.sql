begin;

-- Creator analytics are aggregate-only. The function never returns viewer IDs,
-- per-viewer histories, private content, or another creator's measurements.
create or replace function private.resa_creator_analytics(
  p_from date,
  p_to date
)
returns table (
  metric_date date,
  unique_viewers bigint,
  views bigint,
  completed_views bigint,
  watch_seconds bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_from is null or p_to is null
    or p_to < p_from
    or p_to - p_from > 89
    or p_to > (now() at time zone 'utc')::date then
    raise exception 'invalid_analytics_period' using errcode = '22023';
  end if;

  return query
  select
    i.viewed_on,
    count(distinct i.user_id)::bigint,
    sum(i.view_count)::bigint,
    sum(i.completed_count)::bigint,
    (sum(i.duration_ms) / 1000)::bigint
  from public.resa_feed_impressions i
  join public.resa_contents c on c.id = i.content_id
  where c.author_id = actor_id
    and c.visibility = 'public'
    and c.moderation_status = 'active'
    and i.viewed_on between p_from and p_to
    and i.user_id <> actor_id
  group by i.viewed_on
  having count(distinct i.user_id) >= 5
  order by i.viewed_on asc;
end;
$function$;

revoke all on function private.resa_creator_analytics(date,date) from public, anon;
grant execute on function private.resa_creator_analytics(date,date) to authenticated;

create or replace function public.resa_creator_analytics(
  p_from date,
  p_to date
)
returns table (
  metric_date date,
  unique_viewers bigint,
  views bigint,
  completed_views bigint,
  watch_seconds bigint
)
language sql
stable
security invoker
set search_path = pg_catalog, pg_temp
as $function$
  select * from private.resa_creator_analytics(p_from, p_to);
$function$;

revoke all on function public.resa_creator_analytics(date,date) from public, anon;
grant execute on function public.resa_creator_analytics(date,date) to authenticated;

commit;
