-- Drop previous indexes and create optimized ones that match the exact query pattern
DROP INDEX IF EXISTS idx_auctions_valuation;
DROP INDEX IF EXISTS idx_auctions_domain_age;
DROP INDEX IF EXISTS idx_auctions_end_time_valuation;
DROP INDEX IF EXISTS idx_auctions_end_time_domain_age;

-- Create optimized composite indexes for sorting with end_time filter (most common query pattern)
-- These cover the WHERE end_time >= now() + ORDER BY pattern
CREATE INDEX idx_auctions_valuation_sort ON public.auctions(end_time, valuation DESC NULLS LAST) 
  WHERE end_time IS NOT NULL AND valuation IS NOT NULL;

CREATE INDEX idx_auctions_valuation_sort_asc ON public.auctions(end_time, valuation ASC NULLS LAST) 
  WHERE end_time IS NOT NULL AND valuation IS NOT NULL;

CREATE INDEX idx_auctions_domain_age_sort ON public.auctions(end_time, domain_age DESC NULLS LAST) 
  WHERE end_time IS NOT NULL AND domain_age IS NOT NULL;

CREATE INDEX idx_auctions_domain_age_sort_asc ON public.auctions(end_time, domain_age ASC NULLS LAST) 
  WHERE end_time IS NOT NULL AND domain_age IS NOT NULL;