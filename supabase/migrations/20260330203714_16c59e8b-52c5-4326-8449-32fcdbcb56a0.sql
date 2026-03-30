
-- Increase trickle-delete rate from 500/min to 5000/min to drain 1.5M stale auctions faster
-- This will clear the backlog in ~5 hours instead of 50 hours
SELECT cron.unschedule('trickle-delete-ended-auctions');
SELECT cron.schedule(
  'trickle-delete-ended-auctions',
  '* * * * *',
  $$SELECT public.delete_ended_auctions_batch(5000, 2)$$
);
