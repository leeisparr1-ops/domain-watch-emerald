
-- Recreate the get_auction_count function (ensures it exists in production)
CREATE OR REPLACE FUNCTION public.get_auction_count()
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT GREATEST(
    (SELECT reltuples::bigint FROM pg_class WHERE relname = 'auctions'),
    0
  );
$$;

-- Refresh statistics so reltuples is accurate
ANALYZE public.auctions;
