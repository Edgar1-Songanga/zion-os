-- Enable Supabase's PostgreSQL-native scheduler for server-side RESA call expiry.
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
