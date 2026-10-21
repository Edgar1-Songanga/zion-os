-- Restrict private-Live password RPCs to authenticated users.
-- Both functions are SECURITY DEFINER and must not be callable anonymously.
REVOKE EXECUTE ON FUNCTION public.resa_set_live_password(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resa_set_live_password(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resa_set_live_password(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resa_unlock_private_live(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resa_unlock_private_live(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.resa_unlock_private_live(uuid, text) TO authenticated;
