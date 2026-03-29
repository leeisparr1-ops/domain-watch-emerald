-- Fast batch delete for ended auctions using FOR UPDATE SKIP LOCKED
-- to prevent deadlocks with concurrent sync operations.
-- Excludes namecheap (uses stale-based cleanup instead).
CREATE OR REPLACE FUNCTION public.delete_ended_auctions_batch(
  batch_limit integer DEFAULT 1000,
  older_than_hours integer DEFAULT 0
)
RETURNS TABLE(deleted_count integer, remaining_estimate bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '30s'
AS $$
DECLARE
  _deleted integer;
  _remaining bigint;
  _cutoff timestamptz;
BEGIN
  _cutoff := now() - (older_than_hours || ' hours')::interval;

  WITH to_delete AS (
    SELECT id FROM auctions
    WHERE end_time IS NOT NULL
      AND end_time < _cutoff
      AND inventory_source != 'namecheap'
    LIMIT batch_limit
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM auctions
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS _deleted = ROW_COUNT;

  -- Fast estimate of remaining rows (avoids full count)
  SELECT COALESCE(
    (SELECT reltuples::bigint FROM pg_class WHERE relname = 'auctions'), 0
  ) INTO _remaining;

  RETURN QUERY SELECT _deleted, _remaining;
END;
$$;