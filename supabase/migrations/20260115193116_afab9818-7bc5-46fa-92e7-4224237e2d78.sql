-- Create index on tld column for faster filtering
CREATE INDEX IF NOT EXISTS idx_auctions_tld ON public.auctions (tld);

-- Create index on end_time for faster sorting/filtering
CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON public.auctions (end_time);