-- Create sync_history table to track auction sync operations
CREATE TABLE public.sync_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_source text NOT NULL,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  auctions_count integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  duration_ms integer
);

-- Enable RLS
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view sync history (public data)
CREATE POLICY "Anyone can view sync history"
  ON public.sync_history
  FOR SELECT
  USING (true);

-- Create index for faster queries by inventory source
CREATE INDEX idx_sync_history_source ON public.sync_history(inventory_source);
CREATE INDEX idx_sync_history_synced_at ON public.sync_history(synced_at DESC);