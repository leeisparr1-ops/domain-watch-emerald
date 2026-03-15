
-- Drop scan jobs table
CREATE TABLE public.drop_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL DEFAULT 'upload.csv',
  status TEXT NOT NULL DEFAULT 'processing',
  total_domains INTEGER NOT NULL DEFAULT 0,
  filtered_domains INTEGER NOT NULL DEFAULT 0,
  evaluated_domains INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Drop scan results table
CREATE TABLE public.drop_scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.drop_scans(id) ON DELETE CASCADE,
  domain_name TEXT NOT NULL,
  ai_score INTEGER NOT NULL DEFAULT 0,
  ai_summary TEXT,
  category TEXT,
  estimated_value NUMERIC,
  brandability INTEGER,
  keyword_strength INTEGER,
  length_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_drop_scans_user ON public.drop_scans(user_id, created_at DESC);
CREATE INDEX idx_drop_scan_results_scan ON public.drop_scan_results(scan_id, ai_score DESC);

-- RLS
ALTER TABLE public.drop_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_scan_results ENABLE ROW LEVEL SECURITY;

-- Users can see their own scans
CREATE POLICY "Users can manage own scans" ON public.drop_scans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can see results for their own scans
CREATE POLICY "Users can view own scan results" ON public.drop_scan_results
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.drop_scans ds WHERE ds.id = scan_id AND ds.user_id = auth.uid()));

-- Service role needs insert access for the edge function
CREATE POLICY "Service can insert results" ON public.drop_scan_results
  FOR INSERT TO service_role WITH CHECK (true);
