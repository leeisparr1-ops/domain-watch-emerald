-- Enable required extensions for cron and HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Drop and recreate the trigger_auction_sync function with correct pg_net syntax
DROP FUNCTION IF EXISTS public.trigger_auction_sync();

CREATE OR REPLACE FUNCTION public.trigger_auction_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Call the cron-sync-auctions edge function using pg_net
  PERFORM net.http_post(
    url := 'https://orbygspxutudncbyipst.supabase.co/functions/v1/cron-sync-auctions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yYnlnc3B4dXR1ZG5jYnlpcHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjE2NjQsImV4cCI6MjA4Mzk5NzY2NH0.956zo-yz_1rikHRWfppReftYeDmQf0xy60gezsbONec"}'::jsonb,
    body := '{}'::jsonb
  );
END;
$$;