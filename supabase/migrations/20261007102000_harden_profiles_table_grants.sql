-- Harden direct access to personal profile records.
-- Profiles are only directly accessible by authenticated users and only
-- through the RLS policies that scope reads/writes to the current user.
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;
