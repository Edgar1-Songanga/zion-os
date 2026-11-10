-- Prevent self-approval of account verification, even for a verified global administrator.
-- The API also filters the reviewer's own requests; this database check is authoritative.

create or replace function public.review_account_verification_request(
  p_request_id uuid,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_request public.account_verification_requests%rowtype;
  v_status text;
  v_reason text;
begin
  if auth.uid() is null or not private.is_verified_zion_global_admin() then
    raise exception 'Verified global administrator required' using errcode = '42501';
  end if;

  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;

  v_reason := nullif(left(trim(coalesce(p_reason, '')), 1000), '');
  select * into v_request
  from public.account_verification_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Verification request not found' using errcode = 'P0002';
  end if;
  if v_request.user_id = auth.uid() then
    raise exception 'Administrators cannot review their own verification request' using errcode = '42501';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Verification request is no longer pending' using errcode = '55000';
  end if;

  update public.account_verification_requests
  set status = p_decision,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_reason = v_reason
  where id = p_request_id;

  v_status := case when p_decision = 'approved' then 'verified' else 'rejected' end;
  insert into public.account_identity_status (
    user_id, is_founder, verification_status, verification_type, verified_at, updated_at
  )
  values (
    v_request.user_id,
    false,
    v_status,
    v_request.requested_type,
    case when p_decision = 'approved' then now() else null end,
    now()
  )
  on conflict (user_id) do update set
    verification_status = excluded.verification_status,
    verification_type = excluded.verification_type,
    verified_at = excluded.verified_at,
    updated_at = now();

  return jsonb_build_object(
    'request_id', p_request_id,
    'user_id', v_request.user_id,
    'decision', p_decision,
    'verification_status', v_status,
    'reviewed_by', auth.uid(),
    'reviewed_at', now()
  );
end;
$$;


revoke all on function public.review_account_verification_request(uuid, text, text) from public, anon;
grant execute on function public.review_account_verification_request(uuid, text, text) to authenticated;
