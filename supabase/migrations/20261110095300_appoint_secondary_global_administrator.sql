-- Appoint the explicitly selected existing account as the secondary ZION global administrator.
-- This is a founder-authorized platform appointment, not a claim of government-ID verification.
do $$
declare
  v_founder_id uuid;
  v_admin_id uuid;
begin
  select id into v_founder_id
  from auth.users
  where lower(email) = 'veudaed@gmail.com'
    and raw_app_meta_data->>'zion_global_role' = 'global_admin'
    and raw_app_meta_data->>'zion_verified' = 'true';

  if v_founder_id is null then
    raise exception 'Primary founder global administrator is missing or not verified';
  end if;

  select id into v_admin_id
  from auth.users
  where lower(email) = 'ohuminho@gmail.com'
    and email_confirmed_at is not null;

  if v_admin_id is null then
    raise exception 'The selected secondary administrator account is missing or email is not confirmed';
  end if;

  if v_admin_id = v_founder_id then
    raise exception 'Secondary administrator must be independent from the primary founder account';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'zion_global_role', 'global_admin',
      'zion_verified', true,
      'zion_verification_type', 'platform_admin_appointment'
    )
  where id = v_admin_id;

  insert into public.account_identity_status (
    user_id, is_founder, verification_status, verification_type, verified_at, updated_at
  )
  values (
    v_admin_id, false, 'verified', 'platform_admin_appointment', now(), now()
  )
  on conflict (user_id) do update set
    is_founder = false,
    verification_status = 'verified',
    verification_type = 'platform_admin_appointment',
    verified_at = coalesce(public.account_identity_status.verified_at, now()),
    updated_at = now();

  insert into public.audit_logs (
    organization_id, actor_user_id, action, resource_type, resource_id, metadata
  )
  select
    null, v_founder_id, 'identity.global_admin.appointed', 'user', v_admin_id,
    jsonb_build_object(
      'email', 'ohuminho@gmail.com',
      'role', 'global_admin',
      'appointment_type', 'founder_authorized_secondary_administrator',
      'verification_type', 'platform_admin_appointment'
    )
  where not exists (
    select 1 from public.audit_logs
    where action = 'identity.global_admin.appointed'
      and resource_type = 'user'
      and resource_id = v_admin_id
  );
end;
$$;
