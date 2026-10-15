-- Harden SECURITY DEFINER function resolution paths.
-- Production catalog audit confirmed these functions qualify application tables
-- and private helpers explicitly. They do not need public/auth in search_path.
-- Keeping only trusted system/temp schemas prevents objects in public from
-- shadowing unqualified function/type/operator resolution.
ALTER FUNCTION private.resa_is_community_moderator(uuid, uuid)
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION private.resa_is_conversation_owner(uuid, uuid)
  SET search_path = pg_catalog, pg_temp;

ALTER FUNCTION public.resa_content_author_notification()
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.resa_ensure_profile()
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.resa_follow_notification()
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.resa_mention_notification()
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.resa_message_core_notification()
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.resa_reaction_notification()
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.resa_share_notification()
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.spiritual_growth_from_answered_prayer()
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.spiritual_growth_from_devotion()
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.spiritual_growth_from_prayer()
  SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public.validate_finance_journal_entry()
  SET search_path = pg_catalog, pg_temp;
