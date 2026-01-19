-- Add indexes to improve auction query performance on 398K+ domains
-- These indexes will significantly speed up the common queries

-- Composite index for the main query pattern: end_time filter + sorting + pagination
CREATE INDEX IF NOT EXISTS idx_auctions_end_time_price ON public.auctions (end_time, price);

-- Index for TLD filtering (commonly used filter)
CREATE INDEX IF NOT EXISTS idx_auctions_tld ON public.auctions (tld);

-- Index for auction_type filtering
CREATE INDEX IF NOT EXISTS idx_auctions_auction_type ON public.auctions (auction_type);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_auctions_end_time_tld_price ON public.auctions (end_time, tld, price);

-- Index for domain_name for sorting and searching
CREATE INDEX IF NOT EXISTS idx_auctions_domain_name ON public.auctions (domain_name);

-- Index for bid_count sorting
CREATE INDEX IF NOT EXISTS idx_auctions_bid_count ON public.auctions (bid_count);