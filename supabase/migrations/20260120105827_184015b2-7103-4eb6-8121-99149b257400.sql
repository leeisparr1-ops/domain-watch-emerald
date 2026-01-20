-- Create sync_locks table for preventing overlapping syncs
CREATE TABLE IF NOT EXISTS public.sync_locks (
  id TEXT PRIMARY KEY DEFAULT 'global_sync',
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Insert the default lock row
INSERT INTO public.sync_locks (id, locked_at, locked_by, expires_at)
VALUES ('global_sync', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- No RLS needed - this is only accessed by service role from edge functions
ALTER TABLE public.sync_locks ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only" ON public.sync_locks
  FOR ALL USING (false);

-- Create function to acquire sync lock with expiry (15 min timeout)
CREATE OR REPLACE FUNCTION public.acquire_sync_lock(lock_holder TEXT, lock_duration_minutes INT DEFAULT 15)
RETURNS BOOLEAN AS $$
DECLARE
  acquired BOOLEAN := false;
BEGIN
  -- Try to acquire lock if not locked or if lock expired
  UPDATE public.sync_locks
  SET 
    locked_at = NOW(),
    locked_by = lock_holder,
    expires_at = NOW() + (lock_duration_minutes || ' minutes')::INTERVAL
  WHERE id = 'global_sync'
    AND (locked_at IS NULL OR expires_at < NOW());
  
  IF FOUND THEN
    acquired := true;
  END IF;
  
  RETURN acquired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to release sync lock
CREATE OR REPLACE FUNCTION public.release_sync_lock(lock_holder TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  released BOOLEAN := false;
BEGIN
  UPDATE public.sync_locks
  SET 
    locked_at = NULL,
    locked_by = NULL,
    expires_at = NULL
  WHERE id = 'global_sync'
    AND locked_by = lock_holder;
  
  IF FOUND THEN
    released := true;
  END IF;
  
  RETURN released;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to check if sync is currently running
CREATE OR REPLACE FUNCTION public.is_sync_locked()
RETURNS TABLE(is_locked BOOLEAN, locked_by TEXT, locked_at TIMESTAMP WITH TIME ZONE, expires_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (sl.locked_at IS NOT NULL AND sl.expires_at > NOW()) AS is_locked,
    sl.locked_by,
    sl.locked_at,
    sl.expires_at
  FROM public.sync_locks sl
  WHERE sl.id = 'global_sync';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;