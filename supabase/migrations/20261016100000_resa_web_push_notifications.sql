-- RESA Web Push: subscriptions are scoped to the authenticated account.
create extension if not exists pg_net;

create table if not exists public.resa_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  expiration_time bigint,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resa_push_endpoint_https check (endpoint like 'https://%'),
  constraint resa_push_p256dh_not_empty check (length(p256dh) > 0),
  constraint resa_push_auth_secret_not_empty check (length(auth_secret) > 0)
);

create index if not exists idx_resa_push_subscriptions_user
  on public.resa_push_subscriptions(user_id);

alter table public.resa_push_subscriptions enable row level security;

revoke all on public.resa_push_subscriptions from anon;
grant select, insert, update, delete on public.resa_push_subscriptions to authenticated;

drop policy if exists resa_push_subscriptions_select_own on public.resa_push_subscriptions;
create policy resa_push_subscriptions_select_own
  on public.resa_push_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists resa_push_subscriptions_insert_own on public.resa_push_subscriptions;
create policy resa_push_subscriptions_insert_own
  on public.resa_push_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists resa_push_subscriptions_update_own on public.resa_push_subscriptions;
create policy resa_push_subscriptions_update_own
  on public.resa_push_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists resa_push_subscriptions_delete_own on public.resa_push_subscriptions;
create policy resa_push_subscriptions_delete_own
  on public.resa_push_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.resa_dispatch_web_push()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net, pg_temp
as $function$
declare
  v_service_role_key text;
  v_payload jsonb;
begin
  select decrypted_secret
    into v_service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  -- Push delivery is intentionally fail-open: an absent secret must never
  -- block in-app notification creation.
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
  -- Push is supplemental; do not break the existing notification transaction.
  raise warning 'RESA push dispatch could not be queued: %', sqlerrm;
  return new;
end;
$function$;

revoke all on function public.resa_dispatch_web_push() from public, anon, authenticated;

drop trigger if exists resa_notifications_dispatch_web_push on public.notifications;
create trigger resa_notifications_dispatch_web_push
  after insert on public.notifications
  for each row execute function public.resa_dispatch_web_push();

comment on table public.resa_push_subscriptions is
  'Web Push endpoints for RESA. RLS restricts rows to their owning authenticated user.';
