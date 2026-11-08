begin;

create table if not exists public.resa_story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.resa_contents(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  constraint resa_story_views_unique_viewer unique (story_id, viewer_id)
);

create index if not exists resa_story_views_story_recent_idx
  on public.resa_story_views(story_id, viewed_at desc);
create index if not exists resa_story_views_viewer_recent_idx
  on public.resa_story_views(viewer_id, viewed_at desc);

alter table public.resa_story_views enable row level security;
revoke all on table public.resa_story_views from anon, authenticated;
grant select on table public.resa_story_views to authenticated;

drop policy if exists resa_story_views_author_read on public.resa_story_views;
create policy resa_story_views_author_read
on public.resa_story_views
for select to authenticated
using (
  exists (
    select 1
    from public.resa_contents c
    where c.id = resa_story_views.story_id
      and c.type = 'story'
      and c.author_id = (select auth.uid())
  )
);

create or replace function public.resa_record_story_view(p_story_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $function$
declare
  v_story public.resa_contents%rowtype;
  v_inserted integer;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select c.*
  into v_story
  from public.resa_contents c
  where c.id = p_story_id
    and c.type = 'story'
    and c.created_at >= now() - interval '24 hours';

  if not found or v_story.author_id = auth.uid() then
    return false;
  end if;

  if not private.resa_can_view_content(
    v_story.author_id,
    v_story.visibility,
    v_story.community_id,
    v_story.organization_id
  ) or private.resa_is_blocked_by_or_blocking(v_story.author_id) then
    return false;
  end if;

  insert into public.resa_story_views (story_id, viewer_id)
  values (v_story.id, auth.uid())
  on conflict (story_id, viewer_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$function$;

revoke all on function public.resa_record_story_view(uuid) from public, anon;
grant execute on function public.resa_record_story_view(uuid) to authenticated;

create or replace function public.resa_story_view_count(p_story_id uuid)
returns bigint
language sql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
  select count(*)
  from public.resa_story_views v
  join public.resa_contents c on c.id = v.story_id
  where v.story_id = p_story_id
    and c.type = 'story'
    and c.author_id = auth.uid();
$function$;

revoke all on function public.resa_story_view_count(uuid) from public, anon;
grant execute on function public.resa_story_view_count(uuid) to authenticated;

commit;
