create table if not exists public.resa_feed_interest_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  interest_key text not null check (length(interest_key) between 1 and 180),
  interest_score numeric(10,2) not null default 0 check (interest_score between 0 and 1000),
  view_count integer not null default 0 check (view_count between 0 and 1000000),
  completed_count integer not null default 0 check (completed_count between 0 and 1000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, interest_key),
  check (completed_count <= view_count)
);

create index if not exists resa_feed_interest_profiles_user_score_idx
  on public.resa_feed_interest_profiles (user_id, interest_score desc, updated_at desc);

alter table public.resa_feed_interest_profiles enable row level security;

drop policy if exists resa_feed_interest_profiles_owner_read on public.resa_feed_interest_profiles;
create policy resa_feed_interest_profiles_owner_read
  on public.resa_feed_interest_profiles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists resa_feed_interest_profiles_owner_delete on public.resa_feed_interest_profiles;
create policy resa_feed_interest_profiles_owner_delete
  on public.resa_feed_interest_profiles for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists resa_feed_impressions_owner_delete on public.resa_feed_impressions;
create policy resa_feed_impressions_owner_delete
  on public.resa_feed_impressions for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, delete on public.resa_feed_impressions to authenticated;
grant select, delete on public.resa_feed_interest_profiles to authenticated;

create or replace function public.record_resa_feed_impression(
  p_content_id uuid,
  p_duration_ms integer,
  p_completed boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  content_type text;
  engagement numeric(10,2);
  topic_record record;
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if p_duration_ms is null or p_duration_ms < 1000 or p_duration_ms > 300000 then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;

  select type into content_type
  from public.resa_contents
  where id = p_content_id and visibility = 'public';

  if content_type is null then
    raise exception 'content_not_available' using errcode = 'P0002';
  end if;

  engagement := least(p_duration_ms / 10000.0, 10)
    + case when p_completed then 4 else 0 end;

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
    completed_count = least(1000, public.resa_feed_impressions.completed_count + excluded.completed_count),
    last_viewed_at = now();

  insert into public.resa_feed_interest_profiles (
    user_id, interest_key, interest_score, view_count, completed_count, updated_at
  ) values (
    actor_id, 'type:' || lower(content_type), engagement, 1, case when p_completed then 1 else 0 end, now()
  )
  on conflict (user_id, interest_key)
  do update set
    interest_score = least(1000, public.resa_feed_interest_profiles.interest_score + excluded.interest_score),
    view_count = least(1000000, public.resa_feed_interest_profiles.view_count + 1),
    completed_count = least(1000000, public.resa_feed_interest_profiles.completed_count + excluded.completed_count),
    updated_at = now();

  for topic_record in
    select topic_id from public.resa_content_topics where content_id = p_content_id
  loop
    insert into public.resa_feed_interest_profiles (
      user_id, interest_key, interest_score, view_count, completed_count, updated_at
    ) values (
      actor_id, 'topic:' || topic_record.topic_id::text,
      engagement, 1, case when p_completed then 1 else 0 end, now()
    )
    on conflict (user_id, interest_key)
    do update set
      interest_score = least(1000, public.resa_feed_interest_profiles.interest_score + excluded.interest_score),
      view_count = least(1000000, public.resa_feed_interest_profiles.view_count + 1),
      completed_count = least(1000000, public.resa_feed_interest_profiles.completed_count + excluded.completed_count),
      updated_at = now();
  end loop;
end;
$$;

create or replace function public.reset_resa_feed_memory()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  delete from public.resa_feed_impressions where user_id = actor_id;
  delete from public.resa_feed_interest_profiles where user_id = actor_id;
end;
$$;

revoke all on function public.record_resa_feed_impression(uuid, integer, boolean) from public;
grant execute on function public.record_resa_feed_impression(uuid, integer, boolean) to authenticated;
revoke all on function public.reset_resa_feed_memory() from public;
grant execute on function public.reset_resa_feed_memory() to authenticated;
