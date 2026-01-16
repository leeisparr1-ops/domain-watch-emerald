-- Create a cron job that runs every 3 minutes to sync auctions
-- pg_cron extension is already enabled in Supabase
SELECT cron.schedule(
  'sync-auctions-every-3-minutes',
  '*/3 * * * *',
  $$SELECT public.trigger_auction_sync()$$
);