
-- Create a function to get pattern matches excluding dismissed domains
-- with proper pagination and count
CREATE OR REPLACE FUNCTION public.get_pattern_matches(
  p_user_id UUID,
  p_hide_ended BOOLEAN DEFAULT FALSE,
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  total_count BIGINT,
  alert_id UUID,
  auction_id UUID,
  domain_name TEXT,
  pattern_id UUID,
  alerted_at TIMESTAMPTZ,
  price NUMERIC,
  end_time TIMESTAMPTZ,
  bid_count INT,
  traffic_count INT,
  domain_age INT,
  auction_type TEXT,
  tld TEXT,
  valuation NUMERIC,
  inventory_source TEXT,
  pattern_description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT
      pa.id AS _alert_id,
      pa.auction_id AS _auction_id,
      pa.domain_name AS _domain_name,
      pa.pattern_id AS _pattern_id,
      pa.alerted_at AS _alerted_at,
      a.price AS _price,
      a.end_time AS _end_time,
      a.bid_count AS _bid_count,
      a.traffic_count AS _traffic_count,
      a.domain_age AS _domain_age,
      a.auction_type AS _auction_type,
      a.tld AS _tld,
      a.valuation AS _valuation,
      a.inventory_source AS _inventory_source,
      up.description AS _pattern_description
    FROM pattern_alerts pa
    JOIN auctions a ON a.id = pa.auction_id
    LEFT JOIN user_patterns up ON up.id = pa.pattern_id
    WHERE pa.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM dismissed_domains dd
        WHERE dd.user_id = p_user_id AND dd.domain_name = pa.domain_name
      )
      AND (NOT p_hide_ended OR a.end_time >= NOW())
  )
  SELECT
    (SELECT COUNT(*) FROM filtered)::BIGINT AS total_count,
    f._alert_id,
    f._auction_id,
    f._domain_name,
    f._pattern_id,
    f._alerted_at,
    f._price,
    f._end_time,
    f._bid_count,
    f._traffic_count,
    f._domain_age,
    f._auction_type,
    f._tld,
    f._valuation,
    f._inventory_source,
    f._pattern_description
  FROM filtered f
  ORDER BY f._alerted_at DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;
