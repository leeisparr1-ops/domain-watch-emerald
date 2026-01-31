-- Fix slow valuation/domain_age sorts by matching indexes to ORDER BY
-- Current indexes start with end_time, which prevents Postgres from using them for ORDER BY valuation/domain_age.

-- Drop the previous covering indexes we created
DROP INDEX IF EXISTS public.idx_auctions_val_desc_covering;
DROP INDEX IF EXISTS public.idx_auctions_val_asc_covering;
DROP INDEX IF EXISTS public.idx_auctions_age_desc_covering;
DROP INDEX IF EXISTS public.idx_auctions_age_asc_covering;

-- Create valuation-first covering index (supports both ASC and DESC via forward/backward scans)
-- Add end_time + id as tie-breakers for stable pagination and better plan selection.
CREATE INDEX idx_auctions_valuation_order_covering
ON public.auctions (valuation, end_time, id)
INCLUDE (domain_name, price, bid_count, traffic_count, domain_age, auction_type, tld, inventory_source)
WHERE valuation IS NOT NULL;

-- Create domain_age-first covering index (supports both ASC and DESC)
CREATE INDEX idx_auctions_domain_age_order_covering
ON public.auctions (domain_age, end_time, id)
INCLUDE (domain_name, price, bid_count, traffic_count, valuation, auction_type, tld, inventory_source)
WHERE domain_age IS NOT NULL;
