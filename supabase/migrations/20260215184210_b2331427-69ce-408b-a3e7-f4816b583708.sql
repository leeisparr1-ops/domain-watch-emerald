
-- Store AI-generated trending keywords and market signals
CREATE TABLE public.trending_market_data (
  id TEXT NOT NULL DEFAULT 'latest' PRIMARY KEY,
  trending_keywords JSONB NOT NULL DEFAULT '{}',
  hot_niches JSONB NOT NULL DEFAULT '[]',
  market_signals JSONB NOT NULL DEFAULT '[]',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  model_used TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow public read access (trends are not user-specific)
ALTER TABLE public.trending_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trending data"
ON public.trending_market_data
FOR SELECT
USING (true);

-- Only service role can write (edge function)
CREATE POLICY "Service role can manage trending data"
ON public.trending_market_data
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Seed with initial empty row
INSERT INTO public.trending_market_data (id) VALUES ('latest');
