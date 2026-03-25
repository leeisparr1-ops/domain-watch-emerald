CREATE OR REPLACE FUNCTION public.delete_namecheap_batch(batch_size integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: only service role can run cleanup';
  END IF;

  WITH to_delete AS (
    SELECT id FROM auctions
    WHERE inventory_source = 'namecheap'
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM auctions
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;