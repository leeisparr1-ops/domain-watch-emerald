
CREATE TABLE public.ai_advisor_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_name text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_ai_advisor_cache_domain ON public.ai_advisor_cache (domain_name);
CREATE INDEX idx_ai_advisor_cache_created ON public.ai_advisor_cache (created_at);

ALTER TABLE public.ai_advisor_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cache" ON public.ai_advisor_cache FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Authenticated users can read cache" ON public.ai_advisor_cache FOR SELECT
  USING (auth.uid() IS NOT NULL);
