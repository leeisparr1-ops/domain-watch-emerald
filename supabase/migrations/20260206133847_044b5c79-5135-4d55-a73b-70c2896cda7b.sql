-- Create the missing index for Namecheap filtering on the inventory_source column
-- This is critical for filtering 912k+ Namecheap rows without statement timeouts
CREATE INDEX IF NOT EXISTS idx_auctions_inventory_source_end_time_price 
ON public.auctions (inventory_source, end_time, price) 
WHERE end_time IS NOT NULL;

-- Reload PostgREST schema cache so the new index is recognized
NOTIFY pgrst, 'reload schema';