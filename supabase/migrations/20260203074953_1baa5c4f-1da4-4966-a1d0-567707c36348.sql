-- Add domain_risk column to auctions table for caching spam/blacklist check results
ALTER TABLE public.auctions 
ADD COLUMN IF NOT EXISTS domain_risk jsonb DEFAULT NULL;

-- Add index for efficient querying of domains needing risk checks
CREATE INDEX IF NOT EXISTS idx_auctions_domain_risk_null 
ON public.auctions (domain_name) 
WHERE domain_risk IS NULL;

-- Add comment explaining the column structure
COMMENT ON COLUMN public.auctions.domain_risk IS 'Cached spam/blacklist check results: { checked_at: ISO timestamp, surbl: bool, risk_level: "none"|"low"|"medium"|"high", details: string[] }';