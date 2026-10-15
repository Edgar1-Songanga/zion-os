-- Restrict conversation-table privileges to the minimum needed by the app.
-- RLS does not protect against TRUNCATE, and anonymous users must not have
-- direct DML privileges on private conversation data.
revoke all privileges on table public.resa_conversations from anon;
revoke all privileges on table public.resa_conversation_members from anon;

-- Authenticated members use row-level policies for normal conversation access.
-- They must not be able to bypass row policies with TRUNCATE or create triggers.
revoke truncate, references, trigger
  on table public.resa_conversations, public.resa_conversation_members
  from authenticated;
