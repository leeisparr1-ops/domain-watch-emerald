
-- Portfolio domains table
CREATE TABLE public.portfolio_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain_name text NOT NULL,
  tld text,
  purchase_price numeric NOT NULL DEFAULT 0,
  purchase_date date,
  purchase_source text,
  sale_price numeric,
  sale_date date,
  renewal_cost_yearly numeric DEFAULT 0,
  next_renewal_date date,
  status text NOT NULL DEFAULT 'holding',
  tags text[] DEFAULT '{}',
  notes text,
  auto_valuation numeric,
  valuation_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portfolio_domains ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own portfolio domains"
  ON public.portfolio_domains FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolio domains"
  ON public.portfolio_domains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio domains"
  ON public.portfolio_domains FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio domains"
  ON public.portfolio_domains FOR DELETE
  USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_portfolio_domains_updated_at
  BEFORE UPDATE ON public.portfolio_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for user queries
CREATE INDEX idx_portfolio_domains_user_id ON public.portfolio_domains(user_id);
CREATE INDEX idx_portfolio_domains_status ON public.portfolio_domains(user_id, status);
