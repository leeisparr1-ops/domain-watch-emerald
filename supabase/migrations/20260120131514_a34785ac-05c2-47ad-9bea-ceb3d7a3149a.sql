-- Create a cron job to cleanup expired auctions daily at 3 AM UTC
SELECT cron.schedule(
  'cleanup-expired-auctions-daily',
  '0 3 * * *', -- Run at 3:00 AM UTC every day
  $$
  SELECT net.http_post(
    url := 'https://orbygspxutudncbyipst.supabase.co/functions/v1/cleanup-expired-auctions?days=0&maxBatches=100',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);