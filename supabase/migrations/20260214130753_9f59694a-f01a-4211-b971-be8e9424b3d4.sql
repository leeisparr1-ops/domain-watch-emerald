
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a function that calls cron-sync-auctions with the SYNC_SECRET
-- This uses pg_net to make an async HTTP POST
CREATE OR REPLACE FUNCTION public.trigger_auction_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_url TEXT := 'https://zzigibfdsitbvczozlsg.supabase.co';
  sync_secret TEXT;
BEGIN
  -- Read the SYNC_SECRET from vault (or use a fallback)
  SELECT decrypted_secret INTO sync_secret
    FROM vault.decrypted_secrets
   WHERE name = 'SYNC_SECRET'
   LIMIT 1;

  IF sync_secret IS NULL THEN
    RAISE WARNING 'SYNC_SECRET not found in vault, skipping sync';
    RETURN;
  END IF;

  -- Call the cron-sync-auctions edge function using pg_net
  PERFORM net.http_post(
    url := project_url || '/functions/v1/cron-sync-auctions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || sync_secret
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule cron job: run every 3 hours to sync auctions + check all patterns
SELECT cron.schedule(
  'sync-auctions-periodic',
  '0 */3 * * *',
  $$SELECT public.trigger_auction_sync()$$
);

-- Also create a separate cron to run check-all-patterns every 6 hours
-- (independent of sync, so users get notified even if no new auctions)
CREATE OR REPLACE FUNCTION public.trigger_pattern_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_url TEXT := 'https://zzigibfdsitbvczozlsg.supabase.co';
  sync_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO sync_secret
    FROM vault.decrypted_secrets
   WHERE name = 'SYNC_SECRET'
   LIMIT 1;

  IF sync_secret IS NULL THEN
    RAISE WARNING 'SYNC_SECRET not found in vault, skipping pattern check';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := project_url || '/functions/v1/check-all-patterns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || sync_secret
    ),
    body := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule(
  'check-patterns-periodic',
  '30 */6 * * *',
  $$SELECT public.trigger_pattern_check()$$
);
