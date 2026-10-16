-- Keep the VAPID private key in Supabase Vault, never in source control.
create or replace function public.resa_get_vapid_private_key()
returns text
language sql
security definer
set search_path = pg_catalog, vault, pg_temp
as $function$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'resa_vapid_private_key'
  limit 1;
$function$;

revoke all on function public.resa_get_vapid_private_key() from public, anon, authenticated;
grant execute on function public.resa_get_vapid_private_key() to service_role;

comment on function public.resa_get_vapid_private_key() is
  'Returns the RESA VAPID private key only to the trusted service_role backend.';
