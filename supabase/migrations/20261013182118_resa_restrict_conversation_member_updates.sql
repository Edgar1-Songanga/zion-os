-- Prevent members from changing conversation_id, user_id, role, or join metadata via the Data API.
-- Read-state updates remain available to authenticated users under the existing membership RLS policy.
revoke update on table public.resa_conversation_members from anon, authenticated;
revoke update (conversation_id, joined_at, last_read_at, role, user_id) on table public.resa_conversation_members from anon, authenticated;
grant update (last_read_at) on table public.resa_conversation_members to authenticated;
