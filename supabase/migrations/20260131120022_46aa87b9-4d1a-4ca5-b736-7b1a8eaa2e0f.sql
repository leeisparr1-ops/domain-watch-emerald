-- Add indexes for valuation and domain_age columns to speed up sorting
CREATE INDEX IF NOT EXISTS idx_auctions_valuation ON public.auctions(valuation DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_auctions_domain_age ON public.auctions(domain_age DESC NULLS LAST);

-- Add composite indexes for common sort + filter combinations
CREATE INDEX IF NOT EXISTS idx_auctions_end_time_valuation ON public.auctions(end_time, valuation DESC NULLS LAST) WHERE end_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auctions_end_time_domain_age ON public.auctions(end_time, domain_age DESC NULLS LAST) WHERE end_time IS NOT NULL;