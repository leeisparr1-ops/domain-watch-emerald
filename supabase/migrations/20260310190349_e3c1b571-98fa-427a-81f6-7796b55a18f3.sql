
CREATE INDEX IF NOT EXISTS idx_auctions_hidden_gems
ON public.auctions (valuation, price, brandability_score, pronounceability_score)
WHERE valuation IS NOT NULL
  AND price > 0
  AND scores_computed_at IS NOT NULL
  AND COALESCE(trademark_risk, 'none') != 'high';
