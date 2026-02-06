-- Index to support filtering by inventory_source with price sorting
-- This covers the Namecheap filter + price sort (most common query pattern)
CREATE INDEX idx_auctions_inventory_source_end_time_price 
ON public.auctions (inventory_source, end_time, price)
WHERE end_time IS NOT NULL;

-- Also run ANALYZE to ensure the query planner has up-to-date statistics
ANALYZE public.auctions;