-- Prevent authenticated users from adding themselves to arbitrary private conversations.
-- Conversation creation is performed through the authenticated, atomic RPC; creators retain the separate policy to add other participants.
drop policy if exists resa_conversation_members_insert on public.resa_conversation_members;

-- Keep privileged profile-discovery RPCs on a constrained search path.
alter function public.resa_profiles_for_ids(uuid[]) set search_path = pg_catalog, public, pg_temp;
alter function public.resa_search_profiles(text, integer) set search_path = pg_catalog, public, pg_temp;
