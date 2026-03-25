CREATE OR REPLACE FUNCTION public.delete_namecheap_batch(batch_size integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
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

REVOKE ALL ON FUNCTION public.delete_namecheap_batch(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_namecheap_batch(integer) FROM anon;
REVOKE ALL ON FUNCTION public.delete_namecheap_batch(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_namecheap_batch(integer) TO service_role;