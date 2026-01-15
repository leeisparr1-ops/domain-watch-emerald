-- Enable pg_net extension for HTTP calls from cron
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to trigger the sync edge function
CREATE OR REPLACE FUNCTION public.trigger_auction_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_url TEXT := 'https://orbygspxutudncbyipst.supabase.co';
  service_key TEXT;
BEGIN
  -- Get service role key from vault (if available) or use anon key
  service_key := current_setting('app.settings.service_role_key', true);
  
  -- Call the sync-auctions edge function for different inventory types
  PERFORM extensions.http_post(
    url := project_url || '/functions/v1/sync-auctions?type=endingToday',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  
  PERFORM extensions.http_post(
    url := project_url || '/functions/v1/sync-auctions?type=endingTomorrow',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  
  PERFORM extensions.http_post(
    url := project_url || '/functions/v1/sync-auctions?type=allBiddable',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule cron job to run daily at 17:00 GMT (UTC)
SELECT cron.schedule(
  'sync-godaddy-auctions',
  '0 17 * * *',
  $$SELECT public.trigger_auction_sync()$$
);