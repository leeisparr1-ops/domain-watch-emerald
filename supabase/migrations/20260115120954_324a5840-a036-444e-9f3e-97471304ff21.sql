-- Update the sync function to call the new cron-sync-auctions endpoint
CREATE OR REPLACE FUNCTION public.trigger_auction_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  project_url TEXT := 'https://orbygspxutudncbyipst.supabase.co';
BEGIN
  -- Call the cron-sync-auctions edge function which syncs all inventory types
  PERFORM extensions.http_post(
    url := project_url || '/functions/v1/cron-sync-auctions',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
END;
$function$;