-- Targeted index for inventory_source filtering with end_time sort
-- Essential for the dashboard's primary query pattern on 1M+ rows
CREATE INDEX IF NOT EXISTS idx_auctions_source_endtime 
ON public.auctions (inventory_source, end_time ASC);