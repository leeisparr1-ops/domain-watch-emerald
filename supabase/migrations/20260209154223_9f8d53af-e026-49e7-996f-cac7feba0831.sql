
-- Partial index for the default dashboard query (GoDaddy, sorted by end_time ASC)
-- This directly addresses the 2.3s sequential scan by covering:
--   WHERE inventory_source != 'namecheap' AND end_time > now() ORDER BY end_time ASC
-- Only indexes ~620K rows (not the 1M namecheap rows), keeping WAL impact low during syncs.
CREATE INDEX idx_auctions_end_time_godaddy 
ON auctions (end_time ASC) 
WHERE inventory_source != 'namecheap' AND end_time IS NOT NULL;
