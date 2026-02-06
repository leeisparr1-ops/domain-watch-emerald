
-- Create a fast function to get the auction count from Postgres statistics
-- This is nearly instant compared to COUNT(*) on 2M rows
CREATE OR REPLACE FUNCTION public.get_auction_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT GREATEST(
    (SELECT reltuples::bigint FROM pg_class WHERE relname = 'auctions'),
    0
  );
$$;

-- Run ANALYZE to refresh the statistics right now
ANALYZE public.auctions;
