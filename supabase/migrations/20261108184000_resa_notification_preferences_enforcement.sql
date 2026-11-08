begin;

alter table public.notification_preferences
  add column if not exists sound_enabled boolean not null default true,
  add column if not exists vibration_enabled boolean not null default true;

-- Enforce account-wide notification settings before any notification row is stored.
create or replace function private.resa_apply_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_enabled boolean;
  v_channels text[];
  v_muted_types text[];
begin
  select p.enabled, p.channels, p.muted_types
    into v_enabled, v_channels, v_muted_types
  from public.notification_preferences p
  where p.user_id = new.user_id;

  if not found then
    return new;
  end if;

  if not coalesce(v_enabled, true) then
    return null;
  end if;

  if coalesce(v_muted_types, '{}'::text[]) @> array[new.type]::text[] then
    return null;
  end if;

  if new.channel = 'in_app'
     and not (coalesce(v_channels, array['in_app']::text[]) @> array['in_app']::text[]) then
    return null;
  end if;

  return new;
end;
$function$;

revoke all on function private.resa_apply_notification_preferences() from public, anon, authenticated;
drop trigger if exists resa_apply_notification_preferences on public.notifications;
create trigger resa_apply_notification_preferences
before insert on public.notifications
for each row execute function private.resa_apply_notification_preferences();

-- Web Push is a separate channel: it requires both a saved device subscription
-- and explicit opt-in in notification_preferences.channels. Quiet hours use the
-- member's profile timezone and never suppress critical incoming-call alerts.
create or replace function public.resa_dispatch_web_push()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net, pg_temp
as $function$
declare
  v_service_role_key text;
  v_payload jsonb;
  v_enabled boolean := true;
  v_channels text[] := array['in_app']::text[];
  v_muted_types text[] := '{}'::text[];
  v_quiet_start time;
  v_quiet_end time;
  v_timezone text := 'UTC';
  v_local_time time;
  v_in_quiet_hours boolean := false;
begin
  select p.enabled, p.channels, p.muted_types, p.quiet_start, p.quiet_end
    into v_enabled, v_channels, v_muted_types, v_quiet_start, v_quiet_end
  from public.notification_preferences p
  where p.user_id = new.user_id;

  if not coalesce(v_enabled, true)
     or not (coalesce(v_channels, array['in_app']::text[]) @> array['push']::text[])
     or coalesce(v_muted_types, '{}'::text[]) @> array[new.type]::text[] then
    return new;
  end if;

  if new.priority <> 'critical' and v_quiet_start is not null and v_quiet_end is not null
     and v_quiet_start <> v_quiet_end then
    select p.timezone into v_timezone
    from public.profiles p where p.id = new.user_id;
    if not exists (select 1 from pg_timezone_names where name = coalesce(v_timezone, 'UTC')) then
      v_timezone := 'UTC';
    end if;
    v_local_time := (clock_timestamp() at time zone coalesce(v_timezone, 'UTC'))::time;
    v_in_quiet_hours := case
      when v_quiet_start < v_quiet_end
        then v_local_time >= v_quiet_start and v_local_time < v_quiet_end
      else v_local_time >= v_quiet_start or v_local_time < v_quiet_end
    end;
    if v_in_quiet_hours then
      return new;
    end if;
  end if;

  select decrypted_secret into v_service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  -- Push delivery is supplemental; a missing secret never blocks in-app delivery.
  if coalesce(v_service_role_key, '') = '' then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'notification_id', new.id,
    'user_id', new.user_id,
    'type', new.type,
    'title', new.title,
    'body', new.body,
    'data', coalesce(new.data, '{}'::jsonb),
    'created_at', new.created_at
  );

  perform net.http_post(
    url := 'https://wwdchvadowqakvrxcnkz.supabase.co/functions/v1/resa-push-delivery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := v_payload,
    timeout_milliseconds := 3000
  );

  return new;
exception when others then
  raise warning 'RESA push dispatch could not be queued: %', sqlerrm;
  return new;
end;
$function$;

revoke all on function public.resa_dispatch_web_push() from public, anon, authenticated;

commit;
