
-- Retry drop eval with x-system-secret header
SELECT net.http_post(
  url := 'https://zzigibfdsitbvczozlsg.supabase.co/functions/v1/cron-evaluate-drops',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-system-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SYNC_SECRET' LIMIT 1),
    'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
  ),
  body := '{}'::jsonb
);
