
-- Add keyword_volumes JSONB column to store per-keyword volume estimates from Gemini
-- Structure: { "keyword": { "volume": 50000, "trend": "rising"|"falling"|"stable", "cpc_estimate": 2.50 } }
ALTER TABLE public.trending_market_data
ADD COLUMN IF NOT EXISTS keyword_volumes jsonb NOT NULL DEFAULT '{}'::jsonb;
