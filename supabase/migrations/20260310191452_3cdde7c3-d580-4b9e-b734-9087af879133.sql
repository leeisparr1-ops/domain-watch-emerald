
-- Add gem_score column to auctions table
ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS gem_score smallint DEFAULT NULL;

-- Create index for fast gem score lookups
CREATE INDEX IF NOT EXISTS idx_auctions_gem_score
ON public.auctions (gem_score DESC NULLS LAST)
WHERE gem_score IS NOT NULL AND gem_score >= 50;
