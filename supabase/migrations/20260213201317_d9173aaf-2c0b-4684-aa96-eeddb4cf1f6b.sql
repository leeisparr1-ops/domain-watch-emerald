
CREATE OR REPLACE FUNCTION public.acquire_sync_lock(lock_holder text, lock_duration_minutes integer DEFAULT 15)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acquired BOOLEAN := false;
BEGIN
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service role can acquire sync locks';
  END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.release_sync_lock(lock_holder text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  released BOOLEAN := false;
BEGIN
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service role can release sync locks';
  END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.is_sync_locked()
RETURNS TABLE(is_locked boolean, locked_by text, locked_at timestamp with time zone, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service role can check sync lock status';
  END IF;

  RETURN QUERY
  SELECT 
    (sl.locked_at IS NOT NULL AND sl.expires_at > NOW()) AS is_locked,
    sl.locked_by,
    sl.locked_at,
    sl.expires_at
  FROM public.sync_locks sl
  WHERE sl.id = 'global_sync';
END;
$$;
