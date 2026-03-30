
-- Function that checks cleanup progress and re-enables sync when done
CREATE OR REPLACE FUNCTION public.check_cleanup_and_resume_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '10s'
AS $$
DECLARE
  stale_count bigint;
BEGIN
  -- Quick estimate using a bounded scan
  SELECT COUNT(*) INTO stale_count
  FROM (
    SELECT 1 FROM auctions
    WHERE end_time IS NOT NULL
      AND end_time < now()
      AND inventory_source != 'namecheap'
    LIMIT 1001
  ) sub;

  IF stale_count < 1000 THEN
    -- Cleanup is essentially done, re-enable sync
    PERFORM cron.schedule(
      'sync-auctions-periodic',
      '0 */3 * * *',
      'SELECT public.trigger_auction_sync()'
    );
    -- Remove the trickle-delete job
    PERFORM cron.unschedule('trickle-delete-ended-auctions');
    -- Remove this monitor job itself
    PERFORM cron.unschedule('cleanup-monitor');
    
    RAISE NOTICE 'Cleanup complete (% stale rows). Sync re-enabled, cleanup jobs removed.', stale_count;
  ELSE
    RAISE NOTICE 'Cleanup in progress: >1000 stale rows remain';
  END IF;
END;
$$;
