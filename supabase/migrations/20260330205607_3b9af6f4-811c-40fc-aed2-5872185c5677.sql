
-- Fix the daily-drop-scan cron to use x-cron-source header instead of vault SYNC_SECRET
SELECT cron.unschedule('daily-drop-scan');
SELECT cron.schedule(
  'daily-drop-scan',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zzigibfdsitbvczozlsg.supabase.co/functions/v1/cron-evaluate-drops',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-source', 'pg_cron'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
