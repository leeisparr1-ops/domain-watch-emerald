
-- Table to store shareable AI Domain Advisor reports
CREATE TABLE public.shared_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_name text NOT NULL,
  analysis jsonb NOT NULL,
  pre_scores jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '90 days')
);

-- Enable RLS
ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can view shared reports (public links)
CREATE POLICY "Anyone can view shared reports"
  ON public.shared_reports FOR SELECT
  USING (true);

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create shared reports"
  ON public.shared_reports FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Creators can delete their own reports
CREATE POLICY "Users can delete their own shared reports"
  ON public.shared_reports FOR DELETE
  USING (auth.uid() = created_by);

-- Index for fast lookups
CREATE INDEX idx_shared_reports_created_at ON public.shared_reports (created_at DESC);
