-- Index to support pattern alert checks that query recently updated auctions
-- This is the critical missing index causing statement timeouts in check-all-patterns
CREATE INDEX IF NOT EXISTS idx_auctions_updated_at_desc 
ON public.auctions (updated_at DESC);

-- Index to speed up dedup lookups in pattern alert checking
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_user_alerted 
ON public.pattern_alerts (user_id, alerted_at DESC);