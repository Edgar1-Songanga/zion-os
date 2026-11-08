begin;

-- Cover the leading columns of foreign keys used by RESA live moderation,
-- chat delivery and access-grant cleanup. Existing composite primary keys
-- start with live_id and do not cover user_id lookups.
create index if not exists resa_live_password_attempts_user_id_idx
  on private.resa_live_password_attempts (user_id);

create index if not exists resa_live_access_grants_user_id_idx
  on public.resa_live_access_grants (user_id);

create index if not exists resa_live_chat_messages_sender_id_idx
  on public.resa_live_chat_messages (sender_id);

create index if not exists resa_live_moderators_granted_by_idx
  on public.resa_live_moderators (granted_by);

commit;
