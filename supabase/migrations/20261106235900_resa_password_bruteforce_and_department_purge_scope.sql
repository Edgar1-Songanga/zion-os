begin;

-- Private Live password brute-force protection.
-- Attempts are serialized per (live, user), so concurrent requests cannot bypass the threshold.
create table if not exists private.resa_live_password_attempts (
  live_id uuid not null references public.resa_live_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default clock_timestamp(),
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  locked_until timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (live_id, user_id)
);

alter table private.resa_live_password_attempts enable row level security;
revoke all on table private.resa_live_password_attempts from public, anon, authenticated, service_role;

create or replace function public.resa_set_live_password(p_live_id uuid, p_password text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  changed boolean;
begin
  if auth.uid() is null or p_password is null or length(p_password) < 8 or length(p_password) > 128 then
    return false;
  end if;

  update public.resa_live_sessions
     set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
   where id = p_live_id
     and host_id = auth.uid()
     and visibility = 'private';
  changed := found;

  if changed then
    delete from private.resa_live_password_attempts where live_id = p_live_id;
    delete from public.resa_live_access_grants where live_id = p_live_id;
  end if;

  return changed;
end;
$$;

create or replace function public.resa_unlock_private_live(p_live_id uuid, p_password text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_saved_hash text;
  v_window_started_at timestamptz;
  v_failed_attempts integer;
  v_locked_until timestamptz;
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null or p_live_id is null or p_password is null
     or length(p_password) < 1 or length(p_password) > 128 then
    return false;
  end if;

  select l.password_hash
    into v_saved_hash
    from public.resa_live_sessions l
   where l.id = p_live_id
     and l.visibility = 'private'
     and l.status <> 'ended';

  if v_saved_hash is null then
    return false;
  end if;

  insert into private.resa_live_password_attempts (live_id, user_id)
  values (p_live_id, v_user_id)
  on conflict (live_id, user_id) do nothing;

  select a.window_started_at, a.failed_attempts, a.locked_until
    into v_window_started_at, v_failed_attempts, v_locked_until
    from private.resa_live_password_attempts a
   where a.live_id = p_live_id and a.user_id = v_user_id
   for update;

  if v_locked_until is not null and v_locked_until > v_now then
    return false;
  end if;

  if v_saved_hash = extensions.crypt(p_password, v_saved_hash) then
    delete from private.resa_live_password_attempts
     where live_id = p_live_id and user_id = v_user_id;

    insert into public.resa_live_access_grants (live_id, user_id, expires_at)
    values (p_live_id, v_user_id, v_now + interval '4 hours')
    on conflict (live_id, user_id)
    do update set expires_at = excluded.expires_at, created_at = v_now;

    return true;
  end if;

  if v_window_started_at <= v_now - interval '15 minutes' then
    update private.resa_live_password_attempts
       set window_started_at = v_now,
           failed_attempts = 1,
           locked_until = null,
           updated_at = v_now
     where live_id = p_live_id and user_id = v_user_id;
  else
    update private.resa_live_password_attempts
       set failed_attempts = least(v_failed_attempts + 1, 5),
           locked_until = case
             when v_failed_attempts + 1 >= 5 then v_now + interval '15 minutes'
             else null
           end,
           updated_at = v_now
     where live_id = p_live_id and user_id = v_user_id;
  end if;

  return false;
end;
$$;

revoke all on function public.resa_set_live_password(uuid, text) from public, anon;
revoke all on function public.resa_unlock_private_live(uuid, text) from public, anon;
grant execute on function public.resa_set_live_password(uuid, text) to authenticated;
grant execute on function public.resa_unlock_private_live(uuid, text) to authenticated;

-- Expired records can only be purged within the caller's actual authority:
-- organization managers: all records in the organization;
-- ministry leaders: records belonging to their ministry;
-- class teachers: attendance records belonging to their own classes;
-- assigned workers: only their own personal-ministry follow-ups.
create or replace function public.purge_expired_department_records(
  p_organization_id uuid,
  p_data_domain text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_org_manager boolean;
  v_deleted_count integer := 0;
  v_affected integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_organization_id is null
     or p_data_domain not in ('SABBATH_SCHOOL_ATTENDANCE', 'PERSONAL_MINISTRY_FOLLOW_UP') then
    raise exception 'Unsupported department data domain or organization' using errcode = '22023';
  end if;

  v_is_org_manager := coalesce(
    private.has_org_permission(p_organization_id, 'organization.manage'),
    false
  );

  if not v_is_org_manager then
    if p_data_domain = 'SABBATH_SCHOOL_ATTENDANCE' and not (
      exists (
        select 1
          from public.sabbath_school_classes c
         where c.organization_id = p_organization_id
           and c.teacher_user_id = v_user_id
      )
      or exists (
        select 1
          from public.ministries m
          join public.ministry_leaders ml on ml.ministry_id = m.id
         where m.organization_id = p_organization_id
           and m.department = 'sabbath-school-personal-ministries'
           and ml.user_id = v_user_id
      )
    ) then
      raise exception 'Not authorized to purge Sabbath School attendance outside assigned classes or ministry'
        using errcode = '42501';
    elsif p_data_domain = 'PERSONAL_MINISTRY_FOLLOW_UP' and not (
      exists (
        select 1
          from public.personal_ministry_follow_ups f
         where f.organization_id = p_organization_id
           and f.assigned_to = v_user_id
      )
      or exists (
        select 1
          from public.ministries m
          join public.ministry_leaders ml on ml.ministry_id = m.id
         where m.organization_id = p_organization_id
           and m.department = 'sabbath-school-personal-ministries'
           and ml.user_id = v_user_id
      )
    ) then
      raise exception 'Not authorized to purge personal ministry follow-ups outside assigned records or ministry'
        using errcode = '42501';
    end if;
  end if;

  if p_data_domain = 'SABBATH_SCHOOL_ATTENDANCE' then
    delete from public.sabbath_school_attendance a
     where a.organization_id = p_organization_id
       and a.expires_at <= clock_timestamp()
       and (
         v_is_org_manager
         or exists (
           select 1
             from public.sabbath_school_attendance_sessions s
             join public.sabbath_school_classes c on c.id = s.class_id
            where s.id = a.session_id
              and c.organization_id = p_organization_id
              and (
                c.teacher_user_id = v_user_id
                or exists (
                  select 1 from public.ministry_leaders ml
                   where ml.ministry_id = c.ministry_id and ml.user_id = v_user_id
                )
              )
         )
       );
    get diagnostics v_affected = row_count;
    v_deleted_count := v_deleted_count + v_affected;

    delete from public.sabbath_school_attendance_sessions s
     where s.organization_id = p_organization_id
       and s.expires_at <= clock_timestamp()
       and (
         v_is_org_manager
         or exists (
           select 1
             from public.sabbath_school_classes c
            where c.id = s.class_id
              and c.organization_id = p_organization_id
              and (
                c.teacher_user_id = v_user_id
                or exists (
                  select 1 from public.ministry_leaders ml
                   where ml.ministry_id = c.ministry_id and ml.user_id = v_user_id
                )
              )
         )
       );
    get diagnostics v_affected = row_count;
    v_deleted_count := v_deleted_count + v_affected;

    delete from public.sabbath_school_class_members cm
     where cm.organization_id = p_organization_id
       and cm.expires_at <= clock_timestamp()
       and (
         v_is_org_manager
         or exists (
           select 1
             from public.sabbath_school_classes c
            where c.id = cm.class_id
              and c.organization_id = p_organization_id
              and (
                c.teacher_user_id = v_user_id
                or exists (
                  select 1 from public.ministry_leaders ml
                   where ml.ministry_id = c.ministry_id and ml.user_id = v_user_id
                )
              )
         )
       );
    get diagnostics v_affected = row_count;
    v_deleted_count := v_deleted_count + v_affected;
  else
    delete from public.personal_ministry_follow_ups f
     where f.organization_id = p_organization_id
       and f.expires_at <= clock_timestamp()
       and (
         v_is_org_manager
         or f.assigned_to = v_user_id
         or exists (
           select 1 from public.ministry_leaders ml
            where ml.ministry_id = f.ministry_id and ml.user_id = v_user_id
         )
       );
    get diagnostics v_affected = row_count;
    v_deleted_count := v_deleted_count + v_affected;
  end if;

  return pg_catalog.jsonb_build_object(
    'deleted_records', v_deleted_count,
    'data_domain', p_data_domain,
    'scope', case when v_is_org_manager then 'organization' else 'assigned_scope' end
  );
end;
$$;

revoke all on function public.purge_expired_department_records(uuid, text) from public, anon;
grant execute on function public.purge_expired_department_records(uuid, text) to authenticated;

commit;
