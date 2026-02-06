
-- Re-create the get_auction_count function to ensure it exists in production
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
