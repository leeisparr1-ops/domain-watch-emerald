
SELECT net.http_post(
  url := 'https://zzigibfdsitbvczozlsg.supabase.co/functions/v1/cron-evaluate-drops',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SYNC_SECRET' LIMIT 1),
    'prefer', 'respond-async'
  ),
  body := '{}'::jsonb
);
