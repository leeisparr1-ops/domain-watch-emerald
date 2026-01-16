-- Add indexes to speed up auction queries and prevent timeouts
-- Index on end_time for filtering active auctions (most common query)
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions(end_time);

-- Composite index for common filter + sort patterns
CREATE INDEX IF NOT EXISTS idx_auctions_end_time_price ON public.auctions(end_time, price);

-- Index on domain_name for upsert operations (conflict resolution)
CREATE INDEX IF NOT EXISTS idx_auctions_domain_name ON public.auctions(domain_name);

-- Index on tld for filtering
CREATE INDEX IF NOT EXISTS idx_auctions_tld ON public.auctions(tld);