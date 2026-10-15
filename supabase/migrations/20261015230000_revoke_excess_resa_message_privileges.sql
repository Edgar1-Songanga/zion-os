-- Restrict direct anonymous access and non-DML privileges on RESA messages.
-- Authenticated message access remains controlled by the existing RLS policies.
-- This migration does not modify rows or production data.

REVOKE ALL PRIVILEGES ON TABLE public.resa_messages FROM anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.resa_messages
  FROM authenticated;
