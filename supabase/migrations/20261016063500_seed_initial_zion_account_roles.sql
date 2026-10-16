-- Seed the two explicitly designated initial account roles in server-managed Auth metadata.
-- app_metadata is managed by the server and is not editable by the account owner.
do $$
begin
  if not exists (select 1 from auth.users where lower(email) = 'veudaed@gmail.com') then
    raise exception 'Expected initial global administrator account veudaed@gmail.com was not found';
  end if;
  if not exists (select 1 from auth.users where lower(email) = 'ohuminho@gmail.com') then
    raise exception 'Expected initial member test account ohuminho@gmail.com was not found';
  end if;
end;
$$;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('zion_global_role', 'global_admin')
where lower(email) = 'veudaed@gmail.com';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('zion_global_role', 'member')
where lower(email) = 'ohuminho@gmail.com';
