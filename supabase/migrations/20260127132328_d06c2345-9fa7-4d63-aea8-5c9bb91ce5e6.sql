-- Create table to track domains sent via email to each user
CREATE TABLE public.emailed_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain_name TEXT NOT NULL,
  auction_id UUID NOT NULL,
  pattern_id UUID NOT NULL,
  emailed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, domain_name)
);

-- Enable RLS
ALTER TABLE public.emailed_domains ENABLE ROW LEVEL SECURITY;

-- Users can view their own emailed domains
CREATE POLICY "Users can view their own emailed domains"
ON public.emailed_domains
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_emailed_domains_user_domain ON public.emailed_domains(user_id, domain_name);
CREATE INDEX idx_emailed_domains_user_id ON public.emailed_domains(user_id);

-- Add 30-day auto-cleanup (optional - keeps table from growing indefinitely)
-- Records older than 30 days can be re-sent if domain appears again