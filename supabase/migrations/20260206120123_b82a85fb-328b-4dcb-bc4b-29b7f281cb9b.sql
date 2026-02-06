-- Recreate the get_auction_count function (previous migration may not have applied)
DROP FUNCTION IF EXISTS public.get_auction_count();

CREATE OR REPLACE FUNCTION public.get_auction_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT GREATEST(
    (SELECT reltuples::bigint FROM pg_class WHERE relname = 'auctions'),
    0
  );
$$;

-- Refresh table statistics for accurate count
ANALYZE public.auctions;