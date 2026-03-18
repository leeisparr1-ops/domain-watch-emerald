-- Remove duplicate comparable_sales, keeping the most recent entry
DELETE FROM comparable_sales a
USING comparable_sales b
WHERE a.domain_name = b.domain_name
  AND a.created_at < b.created_at;

-- Now add unique constraint
ALTER TABLE comparable_sales ADD CONSTRAINT comparable_sales_domain_name_key UNIQUE (domain_name);

-- Fix the refresh-trends cron to use async (prevents timeout)
SELECT cron.unschedule(5);

SELECT cron.schedule(
  'refresh-trends-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zzigibfdsitbvczozlsg.supabase.co/functions/v1/refresh-trends',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SYNC_SECRET' LIMIT 1),
      'prefer', 'respond-async'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);