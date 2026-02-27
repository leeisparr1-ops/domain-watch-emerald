
-- Table to track domains a user has dismissed from their matches
CREATE TABLE public.dismissed_domains (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  domain_name text NOT NULL,
  dismissed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain_name)
);

-- Enable RLS
ALTER TABLE public.dismissed_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dismissed domains"
  ON public.dismissed_domains FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss domains"
  ON public.dismissed_domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can un-dismiss domains"
  ON public.dismissed_domains FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups when filtering matches
CREATE INDEX idx_dismissed_domains_user ON public.dismissed_domains(user_id, domain_name);
