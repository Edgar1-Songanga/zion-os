-- Schedule the ZION durable jobs worker through Supabase Cron.
-- Before applying, create a Vault secret named "zion_jobs_worker_key"
-- containing a Supabase secret API key for this project.
select cron.unschedule('zion-jobs-worker')
where exists (select 1 from cron.job where jobname = 'zion-jobs-worker');

select cron.schedule(
  'zion-jobs-worker',
  '*/1 * * * *',
  $$
  select net.http_post(
    url := 'https://wwdchvadowqakvrxcnkz.supabase.co/functions/v1/zion-jobs-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'zion_jobs_worker_key')
    ),
    body := jsonb_build_object('source', 'supabase-cron')
  ) as request_id;
  $$
);
