-- Fix: partial index predicates must be IMMUTABLE, so use `end_time IS NOT NULL` instead of `NOW()`
CREATE INDEX IF NOT EXISTS idx_auctions_end_time_price ON public.auctions (end_time, price) WHERE end_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auctions_tld_end_time ON public.auctions (tld, end_time) WHERE end_time IS NOT NULL;

-- Also index auction_type for type filter
CREATE INDEX IF NOT EXISTS idx_auctions_auction_type ON public.auctions (auction_type);