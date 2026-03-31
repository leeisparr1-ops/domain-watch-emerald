
-- Function to batch-delete junk domains: $1 price, 0 bids, 0 traffic, non-premium TLDs
CREATE OR REPLACE FUNCTION public.delete_junk_domains_batch(batch_limit INT DEFAULT 10000)
RETURNS TABLE(deleted_count BIGINT, remaining_estimate BIGINT) 
LANGUAGE plpgsql AS $$
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

  SELECT COUNT(*) INTO v_remaining FROM auctions
  WHERE price <= 1 AND bid_count = 0 AND traffic_count = 0
    AND tld NOT IN ('com','net','org','io','co','ai','app','dev','xyz','me','info','us','biz','cc','tv');

  RETURN QUERY SELECT v_deleted, v_remaining;
END;
$$;

-- Also target gibberish on ANY TLD (including .cc, .us etc): names with digits mixed in
CREATE OR REPLACE FUNCTION public.delete_gibberish_domains_batch(batch_limit INT DEFAULT 10000)
RETURNS TABLE(deleted_count BIGINT, remaining_estimate BIGINT)
LANGUAGE plpgsql AS $$
DECLARE
  v_deleted BIGINT;
  v_remaining BIGINT;
BEGIN
  WITH to_delete AS (
    SELECT id FROM auctions
    WHERE price <= 1
      AND bid_count = 0
      AND traffic_count = 0
      AND tld != 'com'
      -- Name contains digits mixed with letters (gibberish like hlg7547s, jiuse122)
      AND split_part(domain_name, '.', 1) ~ '[a-z]' 
      AND split_part(domain_name, '.', 1) ~ '[0-9]'
      AND length(split_part(domain_name, '.', 1)) <= 12
    LIMIT batch_limit
  ),
  deleted AS (
    DELETE FROM auctions WHERE id IN (SELECT id FROM to_delete)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;

  SELECT COUNT(*) INTO v_remaining FROM auctions
  WHERE price <= 1 AND bid_count = 0 AND traffic_count = 0
    AND tld != 'com'
    AND split_part(domain_name, '.', 1) ~ '[a-z]'
    AND split_part(domain_name, '.', 1) ~ '[0-9]'
    AND length(split_part(domain_name, '.', 1)) <= 12;

  RETURN QUERY SELECT v_deleted, v_remaining;
END;
$$;

-- Schedule aggressive junk cleanup: every minute, 10k rows per run
SELECT cron.schedule(
  'purge-junk-domains',
  '* * * * *',
  $$SELECT * FROM public.delete_junk_domains_batch(10000);$$
);

-- Schedule gibberish cleanup (alphanumeric nonsense on non-.com): every minute
SELECT cron.schedule(
  'purge-gibberish-domains',
  '* * * * *',
  $$SELECT * FROM public.delete_gibberish_domains_batch(10000);$$
);
