
-- Add pre-computed score columns to auctions table
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS brandability_score smallint,
  ADD COLUMN IF NOT EXISTS pronounceability_score smallint,
  ADD COLUMN IF NOT EXISTS trademark_risk text,
  ADD COLUMN IF NOT EXISTS scores_computed_at timestamptz;

-- Index for finding unscored domains (audit job)
CREATE INDEX IF NOT EXISTS idx_auctions_unscored 
  ON public.auctions (scores_computed_at) 
  WHERE scores_computed_at IS NULL;

-- Comment for clarity
COMMENT ON COLUMN public.auctions.brandability_score IS '0-100 brandability score, computed server-side';
COMMENT ON COLUMN public.auctions.pronounceability_score IS '0-100 pronounceability score, computed server-side';
COMMENT ON COLUMN public.auctions.trademark_risk IS 'none|low|medium|high trademark risk level';
COMMENT ON COLUMN public.auctions.scores_computed_at IS 'When scores were last computed for this domain';
