
CREATE OR REPLACE FUNCTION public.delete_junk_domains_batch(batch_limit integer DEFAULT 10000)
 RETURNS TABLE(deleted_count bigint, remaining_estimate bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_deleted BIGINT;
  v_remaining BIGINT;
BEGIN
  WITH to_delete AS (
    SELECT id FROM auctions
    WHERE price <= 1
      AND bid_count = 0
      AND traffic_count = 0
      AND tld NOT IN ('com','net','org','io','co','ai','app','dev','xyz','me','info','us','biz','cc','tv')
    LIMIT batch_limit
  ),
  deleted AS (
    DELETE FROM auctions WHERE id IN (SELECT id FROM to_delete)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;

  IF v_deleted = 0 THEN
    PERFORM cron.unschedule('purge-junk-domains');
    RAISE NOTICE 'Junk purge complete, cron job unscheduled.';
  END IF;

  SELECT COUNT(*) INTO v_remaining FROM auctions
  WHERE price <= 1 AND bid_count = 0 AND traffic_count = 0
    AND tld NOT IN ('com','net','org','io','co','ai','app','dev','xyz','me','info','us','biz','cc','tv');

  RETURN QUERY SELECT v_deleted, v_remaining;
END;
$function$;
