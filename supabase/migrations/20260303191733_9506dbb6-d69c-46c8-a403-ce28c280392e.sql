
-- Keyword volume cache table for DataForSEO results
CREATE TABLE public.keyword_volume_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  search_volume integer NOT NULL DEFAULT 0,
  cpc numeric(8,2),
  competition numeric(5,4),
  competition_level text,
  trend_direction text,
  monthly_searches jsonb DEFAULT '[]'::jsonb,
  data_source text NOT NULL DEFAULT 'dataforseo',
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT keyword_volume_cache_keyword_key UNIQUE (keyword)
);

-- Index for fast lookups and TTL cleanup
CREATE INDEX idx_kvc_keyword ON public.keyword_volume_cache (keyword);
CREATE INDEX idx_kvc_expires ON public.keyword_volume_cache (expires_at);

-- Enable RLS
ALTER TABLE public.keyword_volume_cache ENABLE ROW LEVEL SECURITY;

-- Public read access (volume data is not user-specific)
CREATE POLICY "Anyone can read keyword volumes"
ON public.keyword_volume_cache
FOR SELECT
USING (true);

-- Only service role can write
CREATE POLICY "Service role can manage keyword volumes"
ON public.keyword_volume_cache
FOR ALL
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);
