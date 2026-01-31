-- Speed up ORDER BY bid_count / end_time / domain_name on large datasets
-- by enabling index-only scans with the exact columns the UI selects.

CREATE INDEX IF NOT EXISTS idx_auctions_bid_count_order_covering
ON public.auctions USING btree (bid_count, end_time, id)
INCLUDE (domain_name, price, traffic_count, domain_age, valuation, auction_type, tld, inventory_source);

CREATE INDEX IF NOT EXISTS idx_auctions_end_time_order_covering
ON public.auctions USING btree (end_time, id)
INCLUDE (domain_name, price, bid_count, traffic_count, domain_age, valuation, auction_type, tld, inventory_source)
WHERE end_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auctions_domain_name_order_covering
ON public.auctions USING btree (domain_name, end_time, id)
INCLUDE (price, bid_count, traffic_count, domain_age, valuation, auction_type, tld, inventory_source);