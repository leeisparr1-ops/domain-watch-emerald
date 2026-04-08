
CREATE OR REPLACE FUNCTION public.delete_long_gibberish_batch(batch_limit integer DEFAULT 5000)
 RETURNS TABLE(deleted_count bigint, remaining_estimate bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '30s'
AS $function$
DECLARE
  v_deleted BIGINT;
  v_remaining BIGINT;
BEGIN
  WITH to_delete AS (
    SELECT id FROM auctions
    WHERE length(split_part(domain_name, '.', 1)) > 20
      AND price <= 5
      AND bid_count = 0
      AND traffic_count = 0
    LIMIT batch_limit
    FOR UPDATE SKIP LOCKED
  ),
  deleted AS (
    DELETE FROM auctions WHERE id IN (SELECT id FROM to_delete)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;

  SELECT COUNT(*) INTO v_remaining FROM (
    SELECT 1 FROM auctions
    WHERE length(split_part(domain_name, '.', 1)) > 20
      AND price <= 5 AND bid_count = 0 AND traffic_count = 0
    LIMIT 1
  ) sub;

  RETURN QUERY SELECT v_deleted, v_remaining;
END;
$function$;
