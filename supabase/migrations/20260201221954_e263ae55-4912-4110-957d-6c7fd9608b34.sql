-- Speed up active-auctions query used by check-pattern-alerts
-- Prevents statement timeouts when filtering/sorting by end_time
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions (end_time);