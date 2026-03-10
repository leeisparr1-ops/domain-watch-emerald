
CREATE OR REPLACE FUNCTION public.find_hidden_gems(
  p_min_gem_score integer DEFAULT 50,
  p_max_price numeric DEFAULT 500,
  p_tld_filter text DEFAULT NULL,
  p_min_brandability integer DEFAULT 0,
  p_min_pronounceability integer DEFAULT 0,
  p_max_length integer DEFAULT 20,
  p_sort_by text DEFAULT 'gem_score',
  p_sort_dir text DEFAULT 'desc',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  total_count bigint,
  id uuid,
  domain_name text,
  price numeric,
  valuation numeric,
  brandability_score smallint,
  pronounceability_score smallint,
  domain_age integer,
  bid_count integer,
  traffic_count integer,
  tld text,
  end_time timestamptz,
  auction_type text,
  inventory_source text,
  trademark_risk text,
  deal_ratio numeric,
  gem_score integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '25s'
AS $$
BEGIN
  RETURN QUERY
  WITH scored AS (
    SELECT
      a.id AS _id,
      a.domain_name AS _domain_name,
      a.price AS _price,
      a.valuation AS _valuation,
      a.brandability_score AS _brandability_score,
      a.pronounceability_score AS _pronounceability_score,
      a.domain_age AS _domain_age,
      a.bid_count AS _bid_count,
      a.traffic_count AS _traffic_count,
      a.tld AS _tld,
      a.end_time AS _end_time,
      a.auction_type AS _auction_type,
      a.inventory_source AS _inventory_source,
      a.trademark_risk AS _trademark_risk,
      CASE WHEN a.price > 0 THEN ROUND(a.valuation / a.price, 2) ELSE 0 END AS _deal_ratio,
      LEAST(100, GREATEST(0, (
        LEAST(100, (CASE WHEN a.price > 0 THEN (a.valuation / a.price) ELSE 0 END) * 10)::integer * 30 / 100
        + COALESCE(a.brandability_score, 0)::integer * 20 / 100
        + COALESCE(a.pronounceability_score, 0)::integer * 15 / 100
        + LEAST(100, COALESCE(a.domain_age, 0) * 5)::integer * 10 / 100
        + GREATEST(0, LEAST(100, (15 - LENGTH(SPLIT_PART(a.domain_name, '.', 1))) * 8))::integer * 10 / 100
        + GREATEST(0, LEAST(100, (10 - a.bid_count) * 10))::integer * 10 / 100
        + (CASE 
            WHEN a.tld = 'com' THEN 80 
            WHEN a.tld = 'ai' THEN 100 
            WHEN a.tld = 'io' THEN 70 
            WHEN a.tld IN ('co','app','dev') THEN 50 
            WHEN a.tld IN ('net','org') THEN 35 
            ELSE 10 
          END)::integer * 5 / 100
      )))::integer AS _gem_score
    FROM auctions a
    WHERE
      a.valuation IS NOT NULL
      AND a.price > 0
      AND a.scores_computed_at IS NOT NULL
      AND COALESCE(a.trademark_risk, 'none') != 'high'
      -- Pre-filter: require minimum deal ratio of 1.0 (valuation > price)
      AND a.valuation > a.price
      AND (a.end_time IS NULL OR a.end_time > NOW())
      AND LENGTH(SPLIT_PART(a.domain_name, '.', 1)) <= p_max_length
      AND a.price <= p_max_price
      AND COALESCE(a.brandability_score, 0) >= p_min_brandability
      AND COALESCE(a.pronounceability_score, 0) >= p_min_pronounceability
      AND (p_tld_filter IS NULL OR a.tld = p_tld_filter)
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM scored WHERE scored._gem_score >= p_min_gem_score
  )
  SELECT
    c.cnt AS total_count,
    s._id,
    s._domain_name,
    s._price,
    s._valuation,
    s._brandability_score,
    s._pronounceability_score,
    s._domain_age,
    s._bid_count,
    s._traffic_count,
    s._tld,
    s._end_time,
    s._auction_type,
    s._inventory_source,
    s._trademark_risk,
    s._deal_ratio,
    s._gem_score
  FROM scored s, counted c
  WHERE s._gem_score >= p_min_gem_score
  ORDER BY
    CASE WHEN p_sort_by = 'gem_score' AND p_sort_dir = 'desc' THEN s._gem_score END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'gem_score' AND p_sort_dir = 'asc' THEN s._gem_score END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'deal_ratio' AND p_sort_dir = 'desc' THEN s._deal_ratio END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'deal_ratio' AND p_sort_dir = 'asc' THEN s._deal_ratio END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price' AND p_sort_dir = 'asc' THEN s._price END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price' AND p_sort_dir = 'desc' THEN s._price END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'brandability' AND p_sort_dir = 'desc' THEN s._brandability_score END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'brandability' AND p_sort_dir = 'asc' THEN s._brandability_score END ASC NULLS LAST,
    s._gem_score DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;
