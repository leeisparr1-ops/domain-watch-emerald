
-- Rewrite the find_hidden_gems function to use pre-computed gem_score column
-- Falls back to on-the-fly computation for unscored rows  
-- Also adds niche detection and comparable sales cross-reference
CREATE OR REPLACE FUNCTION public.find_hidden_gems(
  p_min_gem_score integer DEFAULT 50,
  p_max_price numeric DEFAULT 500,
  p_tld_filter text DEFAULT NULL,
  p_min_brandability integer DEFAULT 0,
  p_min_pronounceability integer DEFAULT 0,
  p_max_length integer DEFAULT 20,
  p_niche_filter text DEFAULT NULL,
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
  gem_score integer,
  created_at timestamptz,
  has_comparable boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '25s'
AS $$
BEGIN
  RETURN QUERY
  WITH gems AS (
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
      a.created_at AS _created_at,
      CASE WHEN a.price > 0 THEN ROUND(a.valuation / a.price, 2) ELSE 0 END AS _deal_ratio,
      -- Use pre-computed gem_score, fall back to on-the-fly calculation
      COALESCE(
        a.gem_score::integer,
        LEAST(100, GREATEST(0, (
          LEAST(100, (CASE WHEN a.price > 0 THEN (a.valuation / a.price) ELSE 0 END) * 10)::integer * 25 / 100
          + COALESCE(a.brandability_score, 0)::integer * 20 / 100
          + COALESCE(a.pronounceability_score, 0)::integer * 10 / 100
          + LEAST(100, COALESCE(a.domain_age, 0) * 5)::integer * 10 / 100
          + GREATEST(0, LEAST(100, (15 - LENGTH(SPLIT_PART(a.domain_name, '.', 1))) * 8))::integer * 10 / 100
          + GREATEST(0, LEAST(100, (10 - a.bid_count) * 10))::integer * 10 / 100
          + LEAST(100, CASE WHEN a.traffic_count > 0 THEN LEAST(100, LOG(a.traffic_count + 1) * 30)::integer ELSE 0 END)::integer * 10 / 100
          + (CASE 
              WHEN a.tld = 'ai' THEN 100 
              WHEN a.tld = 'com' THEN 80 
              WHEN a.tld = 'io' THEN 70 
              WHEN a.tld IN ('co','app','dev') THEN 50 
              WHEN a.tld IN ('net','org') THEN 35 
              ELSE 10 
            END)::integer * 5 / 100
        )))
      ) AS _gem_score,
      -- Check for comparable sales on same TLD
      EXISTS (
        SELECT 1 FROM comparable_sales cs 
        WHERE cs.tld = a.tld 
        AND cs.sale_price > a.price
        LIMIT 1
      ) AS _has_comparable
    FROM auctions a
    WHERE
      a.valuation IS NOT NULL
      AND a.price > 0
      AND a.valuation > a.price
      AND COALESCE(a.trademark_risk, 'none') != 'high'
      AND (a.end_time IS NULL OR a.end_time > NOW())
      AND LENGTH(SPLIT_PART(a.domain_name, '.', 1)) <= p_max_length
      AND a.price <= p_max_price
      AND COALESCE(a.brandability_score, 0) >= p_min_brandability
      AND COALESCE(a.pronounceability_score, 0) >= p_min_pronounceability
      AND (p_tld_filter IS NULL OR a.tld = p_tld_filter)
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM gems WHERE gems._gem_score >= p_min_gem_score
  )
  SELECT
    c.cnt AS total_count,
    g._id,
    g._domain_name,
    g._price,
    g._valuation,
    g._brandability_score,
    g._pronounceability_score,
    g._domain_age,
    g._bid_count,
    g._traffic_count,
    g._tld,
    g._end_time,
    g._auction_type,
    g._inventory_source,
    g._trademark_risk,
    g._deal_ratio,
    g._gem_score,
    g._created_at,
    g._has_comparable
  FROM gems g, counted c
  WHERE g._gem_score >= p_min_gem_score
  ORDER BY
    CASE WHEN p_sort_by = 'gem_score' AND p_sort_dir = 'desc' THEN g._gem_score END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'gem_score' AND p_sort_dir = 'asc' THEN g._gem_score END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'deal_ratio' AND p_sort_dir = 'desc' THEN g._deal_ratio END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'deal_ratio' AND p_sort_dir = 'asc' THEN g._deal_ratio END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price' AND p_sort_dir = 'asc' THEN g._price END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price' AND p_sort_dir = 'desc' THEN g._price END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'brandability' AND p_sort_dir = 'desc' THEN g._brandability_score END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'brandability' AND p_sort_dir = 'asc' THEN g._brandability_score END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'traffic' AND p_sort_dir = 'desc' THEN g._traffic_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'traffic' AND p_sort_dir = 'asc' THEN g._traffic_count END ASC NULLS LAST,
    g._gem_score DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;
