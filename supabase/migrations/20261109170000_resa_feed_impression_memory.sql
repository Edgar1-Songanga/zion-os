create table if not exists public.resa_feed_impressions (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid not null references public.resa_contents(id) on delete cascade,
  viewed_on date not null default (now() at time zone 'utc')::date,
  duration_ms integer not null default 0 check (duration_ms between 0 and 1800000),
  view_count integer not null default 0 check (view_count between 0 and 1000),
  completed_count integer not null default 0 check (completed_count between 0 and 1000),
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, content_id, viewed_on),
  check (completed_count <= view_count)
);

create index if not exists resa_feed_impressions_user_recent_idx
  on public.resa_feed_impressions (user_id, viewed_on desc);

create index if not exists resa_feed_impressions_content_recent_idx
  on public.resa_feed_impressions (content_id, viewed_on desc);

alter table public.resa_feed_impressions enable row level security;

drop policy if exists resa_feed_impressions_owner_read on public.resa_feed_impressions;
create policy resa_feed_impressions_owner_read
  on public.resa_feed_impressions for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.record_resa_feed_impression(
  p_content_id uuid,
  p_duration_ms integer,
  p_completed boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_duration_ms is null or p_duration_ms < 1000 or p_duration_ms > 300000 then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.resa_contents
    where id = p_content_id and visibility = 'public'
  ) then
    raise exception 'content_not_available' using errcode = 'P0002';
  end if;

  insert into public.resa_feed_impressions (
    user_id, content_id, viewed_on, duration_ms, view_count, completed_count, last_viewed_at
  ) values (
    actor_id, p_content_id, (now() at time zone 'utc')::date,
    least(p_duration_ms, 300000), 1, case when p_completed then 1 else 0 end, now()
  )
  on conflict (user_id, content_id, viewed_on)
  do update set
    duration_ms = least(1800000, public.resa_feed_impressions.duration_ms + excluded.duration_ms),
    view_count = least(1000, public.resa_feed_impressions.view_count + 1),
    completed_count = least(
      1000,
      public.resa_feed_impressions.completed_count + excluded.completed_count
    ),
    last_viewed_at = now();
end;
$$;

revoke all on function public.record_resa_feed_impression(uuid, integer, boolean) from public;
grant execute on function public.record_resa_feed_impression(uuid, integer, boolean) to authenticated;
