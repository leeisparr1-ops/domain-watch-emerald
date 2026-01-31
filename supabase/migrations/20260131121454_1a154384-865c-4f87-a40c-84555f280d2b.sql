-- Create covering indexes for index-only scans (much faster as no table access needed)
-- These include all columns selected in the query

DROP INDEX IF EXISTS idx_auctions_valuation_sort;
DROP INDEX IF EXISTS idx_auctions_valuation_sort_asc;
DROP INDEX IF EXISTS idx_auctions_domain_age_sort;
DROP INDEX IF EXISTS idx_auctions_domain_age_sort_asc;

-- Covering index for valuation DESC sort (includes all selected columns)
CREATE INDEX idx_auctions_val_desc_covering ON public.auctions(
  end_time, valuation DESC NULLS LAST
) INCLUDE (id, domain_name, price, bid_count, traffic_count, domain_age, auction_type, tld, inventory_source)
WHERE end_time IS NOT NULL AND valuation IS NOT NULL;

-- Covering index for valuation ASC sort
CREATE INDEX idx_auctions_val_asc_covering ON public.auctions(
  end_time, valuation ASC NULLS LAST
) INCLUDE (id, domain_name, price, bid_count, traffic_count, domain_age, auction_type, tld, inventory_source)
WHERE end_time IS NOT NULL AND valuation IS NOT NULL;

-- Covering index for domain_age DESC sort
CREATE INDEX idx_auctions_age_desc_covering ON public.auctions(
  end_time, domain_age DESC NULLS LAST
) INCLUDE (id, domain_name, price, bid_count, traffic_count, valuation, auction_type, tld, inventory_source)
WHERE end_time IS NOT NULL AND domain_age IS NOT NULL;

-- Covering index for domain_age ASC sort
CREATE INDEX idx_auctions_age_asc_covering ON public.auctions(
  end_time, domain_age ASC NULLS LAST
) INCLUDE (id, domain_name, price, bid_count, traffic_count, valuation, auction_type, tld, inventory_source)
WHERE end_time IS NOT NULL AND domain_age IS NOT NULL;